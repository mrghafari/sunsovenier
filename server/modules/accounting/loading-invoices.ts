import {createHash,randomUUID} from "node:crypto";
import {sql} from "drizzle-orm";
import {loadingInvoiceFiltersSchema,loadingInvoiceCommandSchema,type LoadingInvoicePlan,type LoadingInvoiceWorkbench,type LoadingInvoiceBlocker} from "@shared/accounting-loading-invoices";
import type {AccountingAccess} from "@shared/accounting-api";
import {AccountingError} from "./access";
import {accountingDb,type AccountingTransaction} from "./db";
import {calculateLoadingInvoicePreview} from "./loading-invoice-calculation";
import {readCommercialWeight} from "./commercial-weight";
import {allocateCarryingLayers,readCarryingLayers,assertPipelineManager,assertLoadingPipelineReady} from "./loading-invoice-stock";
import {Money,decimal,exactMoney} from "./money";
import {postJournalEntry,type JournalInput} from "./postJournalEntry";
import {settleWalletReceivable} from "./wallet-settlement";
import {assertLedgerReady} from "./readiness";
const obj=(v:unknown):Record<string,unknown>=>v&&typeof v==="object"&&!Array.isArray(v)?v as Record<string,unknown>:{};
function metric(line:Record<string,unknown>){
  if(typeof line.quantity!=="string"||typeof line.unit!=="string")throw new Error("Missing quantity");
  const q=decimal(line.quantity),unit=line.unit.trim().toLowerCase();
  if(!q.gt(0))throw new Error("Invalid quantity");
  if(["ton","tons","tonne","tonnes","t","طن","تن"].includes(unit))return q;
  if(["kg","kilogram","kilograms","کیلوگرم","كيلوغرام","کيلوغرام"].includes(unit))return q.div(1000);
  throw new Error("Unknown measured order unit");
}
export function standardOrderWeightCovered(payloads:unknown[]){
  try{
    if(!payloads.length)return false;
    const first=obj(obj(payloads[0]).order),snapshot=JSON.stringify(first.lines);
    if(!Array.isArray(first.lines)||!first.lines.length)return false;
    const limits=new Map<number,InstanceType<typeof Money>>();
    for(const raw of first.lines){const l=obj(raw);if(typeof l.orderItemId!=="number"||limits.has(l.orderItemId))return false;limits.set(l.orderItemId,metric(l));}
    const used=new Map<number,InstanceType<typeof Money>>();
    for(const raw of payloads){
      const p=obj(raw),order=obj(p.order),input=obj(p.input);
      if(order.version!==1||JSON.stringify(order.lines)!==snapshot||!Array.isArray(input.lines))return false;
      for(const rawLine of input.lines){
        const l=obj(rawLine);if(typeof l.orderItemId!=="number"||typeof l.actualWeightTons!=="string"||!limits.has(l.orderItemId))return false;
        const qty=decimal(l.actualWeightTons);if(!qty.gt(0))return false;
        used.set(l.orderItemId,(used.get(l.orderItemId)??new Money(0)).plus(qty));
      }
    }
    return [...used].every(([id,q])=>q.lte(limits.get(id)!));
  }catch{return false;}
}
async function planWithin(tx:AccountingTransaction,companyId:number,factId:number):Promise<LoadingInvoicePlan>{
  const c=(await tx.execute(sql`select c.*,cur.decimals from accounting_companies c
    join accounting_currencies cur on cur.code=c.base_currency where c.id=${companyId}`)).rows[0];
  if(!c)throw new AccountingError("Accounting company not found",404,"NOT_FOUND");
  const f=(await tx.execute(sql`select * from accounting_operational_facts where id=${factId} and company_id=${companyId} and event_type='LoadingCompleted'`)).rows[0];
  if(!f)throw new AccountingError("Loading not found",404,"NOT_FOUND");
  const existing=(await tx.execute(sql`select * from accounting_loading_invoices where fact_id=${factId} and company_id=${companyId}`)).rows[0];
  if(existing){
    const stored=existing.plan as LoadingInvoicePlan;
    return {...stored,postingAllowed:false,posted:{invoiceId:Number(existing.id),journalId:Number(existing.journal_id),
      cogsJournalId:existing.cogs_journal_id==null?null:Number(existing.cogs_journal_id),receivableId:Number(existing.receivable_id),
      settlementId:existing.settlement_id==null?null:Number(existing.settlement_id)}};
  }
  const p=obj(f.payload),input=obj(p.input),order=obj(p.order);
  const shipping=(await tx.execute(sql`select currency,order_shipping_total::text as total,amount::text as amount
    from accounting_loading_shipping where fact_id=${factId} and company_id=${companyId}`)).rows[0];
  const currencies=(await tx.execute(sql`select code,decimals from accounting_currencies where is_active`)).rows as {code:string;decimals:number}[];
  const quoted=calculateLoadingInvoicePreview({id:factId,companyId,orderId:Number(f.order_id),sourceId:String(f.source_id),payload:f.payload},
    currencies,shipping?{factId,companyId,orderId:Number(f.order_id),currency:String(shipping.currency),orderTotal:String(shipping.total),amount:String(shipping.amount)}:undefined);
  const blockers=new Set<LoadingInvoiceBlocker>();
  if(!quoted.amounts)blockers.add("INVALID_CAPTURE");
  if(quoted.currency!==c.base_currency)blockers.add("FOREIGN_INVOICE_VALUATION_REQUIRED");
  const gate=(await tx.execute(sql`select *,starts_on::text as starts_on from accounting_invoice_cutovers where company_id=${companyId}`)).rows[0];
  const live=(await tx.execute(sql`select 1 from accounting_wallet_cutovers w join accounting_receipt_cutovers r
    on r.company_id=w.company_id and r.processing_ready where w.company_id=${companyId} and w.pipeline_ready`)).rows.length>0;
  if(!c.is_active||!gate?.processing_ready||!live)blockers.add("CUTOVER_CLOSED");
  const native=(await tx.execute(sql`select id,accounting_company_id,accounting_snapshot_version,payment_status,status,contract_id
    from customer_orders where id=${Number(f.order_id)}`)).rows[0];
  if(!native||Number(native.accounting_company_id)!==companyId||native.accounting_snapshot_version!==1||order.version!==1||
    order.companyId!==companyId||order.orderId!==Number(f.order_id)||
    ["paid","completed"].includes(String(native.payment_status).toLowerCase())||
    ["cancelled","failed","deleted","financial_rejected"].includes(String(native.status).toLowerCase())||
    (gate&&Number(f.order_id)<Number(gate.first_order_id))||
    (gate?.starts_on&&String(input.eventDate)<String(gate.starts_on)))
    blockers.add("LEGACY_OR_PAID_ORDER");
  const finance=(await tx.execute(sql`select customer_id,currency from accounting_credit_orders
    where company_id=${companyId} and order_id=${Number(f.order_id)} and status='approved'
    union select w.customer_id,h.currency from accounting_wallet_holds h join accounting_wallet_links w
    on w.wallet_id=h.wallet_id and w.company_id=h.company_id where h.company_id=${companyId}
    and h.order_id=${Number(f.order_id)} and h.status='active' and h.amount>h.consumed_amount`)).rows;
  const customers=[...new Set(finance.filter(x=>x.currency===quoted.currency).map(x=>Number(x.customer_id)))];
  const customerId=customers.length===1?customers[0]:null;
  if(!finance.length)blockers.add("FINANCE_APPROVAL_REQUIRED");
  if(!customerId)blockers.add("CUSTOMER_BINDING_REQUIRED");
  const history=(await tx.execute(sql`select payload from accounting_operational_facts where company_id=${companyId}
    and order_id=${Number(f.order_id)} and event_type='LoadingCompleted' order by id`)).rows;
  if(native?.contract_id){
    const review=await readCommercialWeight({companyId,orderId:Number(f.order_id)},
      {actorId:String(f.actor_id),actorType:f.actor_type as "admin"|"custom",canApprove:false},tx);
    if(!review.approved||review.weightControl.status!=="WITHIN_CONTRACT")blockers.add("COMMERCIAL_REVIEW_REQUIRED");
  }else if(!standardOrderWeightCovered(history.map(h=>h.payload)))blockers.add("ORDER_WEIGHT_REQUIRED");
  if(quoted.eventDate&&!(await tx.execute(sql`select 1 from accounting_fiscal_years where company_id=${companyId}
    and status='open' and starts_on<=${quoted.eventDate}::date and ends_on>=${quoted.eventDate}::date`)).rows.length)
    blockers.add("OPEN_PERIOD_REQUIRED");
  const required=["ACCOUNTS_RECEIVABLE","SALES_REVENUE","COGS","INVENTORY",
    ...(quoted.amounts&&decimal(quoted.amounts.tax).gt(0)?["TAX_PAYABLE"]:[]),
    ...(quoted.amounts&&decimal(quoted.amounts.shipping).gt(0)?["SHIPPING_REVENUE"]:[])];
  const mappings=(await tx.execute(sql`select p.key,p.account_id from accounting_posting_rules p join accounting_accounts a on a.id=p.account_id
    and a.company_id=p.company_id and a.is_active and a.is_posting where p.company_id=${companyId}`)).rows;
  if(required.some(key=>!mappings.some(m=>m.key===key)))blockers.add("POSTING_MAPPING_REQUIRED");
  if(gate?.starts_on&&quoted.eventDate){
    if((await tx.execute(sql`select 1 from accounting_loading_invoices i join accounting_operational_facts later on later.id=i.fact_id
      where i.company_id=${companyId} and (later.payload->'input'->>'eventDate',later.id)>(${quoted.eventDate},${factId}) limit 1`)).rows.length)
      blockers.add("BACKDATED_HISTORY_RECONCILIATION_REQUIRED");
    const earlier=(await tx.execute(sql`select 1 from accounting_operational_facts other
      where other.company_id=${companyId} and other.event_type='LoadingCompleted' and other.order_id>=${Number(gate.first_order_id)}
      and not exists(select 1 from accounting_loading_invoices i where i.fact_id=other.id)
      and (other.payload->'input'->>'eventDate' is null or other.payload->'input'->>'eventDate' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        or (other.payload->'input'->>'eventDate'>=${String(gate.starts_on)} and
          (other.payload->'input'->>'eventDate',other.id)<(${quoted.eventDate},${factId}))) limit 1`)).rows[0];
    if(earlier)blockers.add("EARLIER_LOADING_PENDING");
  }
  let allocations:LoadingInvoicePlan["allocations"]=[];
  let baseCost:string|null=null;
  // A failed evidence query is an API failure, not an observed stock shortfall.
  const carryingLayers=await readCarryingLayers(tx,companyId);
  if(!(await tx.execute(sql`select accounting_stock_ledger_reconciled(${companyId}) as reconciled`)).rows[0]?.reconciled)
    blockers.add("STOCK_RECONCILIATION_REQUIRED");
  try{
    const measured=Array.isArray(input.lines)?input.lines.map(raw=>{
      const l=obj(raw),snapshot=(Array.isArray(order.lines)?order.lines:[]).map(obj).find(x=>x.orderItemId===l.orderItemId);
      if(!snapshot||typeof snapshot.productId!=="number"||typeof l.actualWeightTons!=="string"||typeof l.orderItemId!=="number")
        throw new Error("Missing product identity");
      return {orderItemId:l.orderItemId,productId:snapshot.productId,quantityTons:l.actualWeightTons};
    }):[];
    const result=measured.length&&quoted.eventDate?allocateCarryingLayers(carryingLayers,measured,quoted.eventDate,Number(c.decimals)):null;
    if(result){allocations=result;baseCost=exactMoney(result.reduce((sum,l)=>sum.plus(l.baseCost),new Money(0)).toFixed(),Number(c.decimals));}
    else blockers.add("VERIFIED_STOCK_SHORTFALL");
  }catch{blockers.add("VERIFIED_STOCK_SHORTFALL");}
  const plan={companyId,factId,orderId:Number(f.order_id),sourceId:String(f.source_id),eventDate:quoted.eventDate,currency:quoted.currency,
    baseCurrency:String(c.base_currency),customerId,amounts:quoted.amounts,allocations,baseCost,blockers:[...blockers].sort(),
    postingAllowed:!blockers.size,posted:null};
  const planHash=createHash("sha256").update(JSON.stringify({plan,
    mappingIds:mappings.map(x=>[x.key,x.account_id]).sort((a,b)=>String(a[0]).localeCompare(String(b[0]))),
    cutover:gate?{startsOn:gate.starts_on,firstOrderId:gate.first_order_id}:null,
  })).digest("hex");
  return {...plan,planHash};
}
export async function readLoadingInvoiceWorkbench(input:unknown,callerTx?:AccountingTransaction):Promise<LoadingInvoiceWorkbench>{
  const parsed=loadingInvoiceFiltersSchema.safeParse(input);if(!parsed.success)throw new AccountingError(parsed.error.issues[0].message);
  const f=parsed.data,run=async(tx:AccountingTransaction)=>{
    const c=(await tx.execute(sql`select id,name,base_currency from accounting_companies where id=${f.companyId}`)).rows[0];
    if(!c)throw new AccountingError("Accounting company not found",404,"NOT_FOUND");
    const scope=sql`company_id=${f.companyId} and event_type='LoadingCompleted' ${f.orderId?sql`and order_id=${f.orderId}`:sql``}`;
    const count=(await tx.execute(sql`select count(*) as n from accounting_operational_facts where ${scope}`)).rows[0];
    const facts=(await tx.execute(sql`select id from accounting_operational_facts where ${scope} order by id desc
      limit ${f.pageSize} offset ${(f.page-1)*f.pageSize}`)).rows;
    const rows=[];for(const fact of facts)rows.push(await planWithin(tx,f.companyId,Number(fact.id)));
    const gate=(await tx.execute(sql`select i.processing_ready from accounting_invoice_cutovers i
      join accounting_companies c on c.id=i.company_id and c.is_active
      join accounting_wallet_cutovers w on w.company_id=i.company_id and w.pipeline_ready
      join accounting_receipt_cutovers r on r.company_id=i.company_id and r.processing_ready where i.company_id=${f.companyId}`)).rows[0];
    return {company:{id:Number(c.id),name:String(c.name),baseCurrency:String(c.base_currency)},rows,
      pagination:{page:f.page,pageSize:f.pageSize,totalRows:Number(count.n)},activationEnabled:Boolean(gate?.processing_ready)};
  };
  return callerTx?run(callerTx):accountingDb.transaction(run,{isolationLevel:"repeatable read",accessMode:"read only"});
}
export async function issueLoadingInvoice(input:unknown,actor:AccountingAccess,callerTx?:AccountingTransaction){
  const parsed=loadingInvoiceCommandSchema.safeParse(input);if(!parsed.success)throw new AccountingError(parsed.error.issues[0].message);
  const d=parsed.data,run=async(tx:AccountingTransaction)=>{
    await tx.execute(sql`select pg_advisory_xact_lock(718392,0)`);await assertPipelineManager(tx,actor);await assertLedgerReady(tx);await assertLoadingPipelineReady(tx);
    const old=(await tx.execute(sql`select * from accounting_loading_invoices where company_id=${d.companyId} and fact_id=${d.factId}`)).rows[0];
    if(old){
      if((old.plan as LoadingInvoicePlan).planHash!==d.expectedPlanHash||old.reason!==d.reason||old.settle_from_hold!==d.settleFromHold)
        throw new AccountingError("Loading source was already issued with different command",409,"IDEMPOTENCY_CONFLICT");
      return {...(await planWithin(tx,d.companyId,d.factId)).posted,duplicate:true};
    }
    const plan=await planWithin(tx,d.companyId,d.factId);
    if(!plan.postingAllowed)throw new AccountingError(`Invoice blocked: ${plan.blockers.join(", ")}`,409,"LOADING_INVOICE_BLOCKED");
    if(plan.planHash!==d.expectedPlanHash)throw new AccountingError("Invoice evidence changed; reload before issuing",409,"STALE_INVOICE_PLAN");
    const maps=(await tx.execute(sql`select key,account_id from accounting_posting_rules where company_id=${d.companyId}`)).rows;
    const account=(key:string)=>Number(maps.find(m=>m.key===key)!.account_id);
    const lines:JournalInput["lines"]=[{accountId:account("ACCOUNTS_RECEIVABLE"),currency:plan.currency!,debit:plan.amounts!.total,
      partyType:"customer",partyId:plan.customerId!}];
    for(const [key,amount] of [["SALES_REVENUE",plan.amounts!.goods],["TAX_PAYABLE",plan.amounts!.tax],["SHIPPING_REVENUE",plan.amounts!.shipping]])
      if(decimal(amount).gt(0))lines.push({accountId:account(key),currency:plan.currency!,credit:amount});
    await tx.execute(sql`set constraints accounting_balance_header,accounting_balance_lines,accounting_invoice_evidence_guard,accounting_stock_ledger_parity_guard deferred`);
    const invoice=await postJournalEntry({companyId:d.companyId,entryDate:plan.eventDate!,sourceType:"LoadingCompleted",
      sourceId:plan.sourceId,description:d.reason,lines},actor,tx);
    await tx.execute(sql`set constraints accounting_balance_header,accounting_balance_lines,accounting_invoice_evidence_guard,accounting_stock_ledger_parity_guard deferred`);
    const receivable=(await tx.execute(sql`insert into accounting_receivable_items(company_id,customer_id,currency,invoice_journal_id,
      order_id,amount,issued_on,due_on,invoice_reference) values(${d.companyId},${plan.customerId!},${plan.currency!},${invoice.entry.id},
      ${plan.orderId},${plan.amounts!.total}::numeric,${plan.eventDate!}::date,${plan.amounts!.dueDate}::date,${plan.sourceId}) returning id`)).rows[0];
    let cogsId:number|null=null;
    if(decimal(plan.baseCost!).gt(0)){
      const cost=await postJournalEntry({companyId:d.companyId,entryDate:plan.eventDate!,sourceType:"LoadingCOGS",
        sourceId:plan.sourceId,description:d.reason,lines:[
          {accountId:account("COGS"),currency:plan.baseCurrency,debit:plan.baseCost!},
          {accountId:account("INVENTORY"),currency:plan.baseCurrency,credit:plan.baseCost!},
        ]},actor,tx);cogsId=cost.entry.id;
    }
    let settlementId:number|null=null;
    if(d.settleFromHold){
      const hold=(await tx.execute(sql`select h.id,h.wallet_id,(h.amount-h.consumed_amount)::text as remaining
        from accounting_wallet_holds h join accounting_wallet_links w on w.wallet_id=h.wallet_id and w.company_id=h.company_id
        where h.company_id=${d.companyId} and h.order_id=${plan.orderId} and h.status='active'
          and h.currency=${plan.currency!} and w.customer_id=${plan.customerId!} and h.amount>h.consumed_amount order by h.id limit 1`)).rows[0];
      if(!hold)throw new AccountingError("No approved active hold for this loading",409,"LOADING_HOLD_REQUIRED");
      const amount=Money.min(decimal(String(hold.remaining)),decimal(plan.amounts!.total)).toFixed();
      await tx.execute(sql`set constraints accounting_balance_header,accounting_balance_lines,accounting_invoice_evidence_guard,accounting_stock_ledger_parity_guard deferred`);
      const settlement=await settleWalletReceivable({companyId:d.companyId,walletId:Number(hold.wallet_id),
        receivableId:Number(receivable.id),holdId:Number(hold.id),sourceId:`loading:${d.factId}`,entryDate:plan.eventDate!,amount,reason:d.reason},actor,tx);
      settlementId=Number(settlement.settlementId);
    }
    const saved=(await tx.execute(sql`insert into accounting_loading_invoices(company_id,fact_id,journal_id,cogs_journal_id,
      receivable_id,settlement_id,base_cost,plan,actor_id,actor_type,reason,settle_from_hold)
      values(${d.companyId},${d.factId},${invoice.entry.id},${cogsId},${Number(receivable.id)},${settlementId},
        ${plan.baseCost!}::numeric,${JSON.stringify(plan)}::jsonb,${actor.actorId},${actor.actorType},${d.reason},${d.settleFromHold}) returning id`)).rows[0];
    for(const a of plan.allocations)await tx.execute(sql`insert into accounting_stock_consumptions(invoice_id,layer_id,order_item_id,quantity_tons,base_cost)
      values(${Number(saved.id)},${a.layerId},${a.orderItemId},${a.quantityTons}::numeric,${a.baseCost}::numeric)`);
    await tx.execute(sql`insert into accounting_audit_logs(company_id,actor_id,actor_type,action,entity_type,entity_id,after)
      values(${d.companyId},${actor.actorId},${actor.actorType},'issue_loading_invoice','loading_invoice',${String(saved.id)},
        ${JSON.stringify({factId:d.factId,sourceId:plan.sourceId,planHash:plan.planHash,journalId:invoice.entry.id,cogsJournalId:cogsId,
          receivableId:receivable.id,settlementId,physicalStockChanged:false,orderStatusChanged:false})}::jsonb)`);
    await tx.execute(sql`set constraints accounting_balance_header,accounting_balance_lines,accounting_invoice_evidence_guard,accounting_stock_ledger_parity_guard immediate`);
    return {invoiceId:Number(saved.id),journalId:invoice.entry.id,cogsJournalId:cogsId,receivableId:Number(receivable.id),settlementId,duplicate:false};
  };
  if(!callerTx)return accountingDb.transaction(run);
  // A caller may catch an ordinary JS validation/settlement error and continue
  // its transaction. Preserve atomicity even in that composition.
  const mark=sql.identifier(`loading_invoice_${randomUUID().replaceAll("-","")}`);
  await callerTx.execute(sql`savepoint ${mark}`);
  try{
    const result=await run(callerTx);await callerTx.execute(sql`release savepoint ${mark}`);return result;
  }catch(error){
    await callerTx.execute(sql`rollback to savepoint ${mark}`);
    await callerTx.execute(sql`release savepoint ${mark}`);
    throw error;
  }
}
