import {createHash,randomUUID} from "node:crypto";
import {sql} from "drizzle-orm";
import {capitalizationCommandSchema,capitalizationQuerySchema,type CapitalizationPlan,type CapitalizationWorkbench} from "@shared/accounting-inventory-capitalization";
import type {AccountingAccess} from "@shared/accounting-api";
import {accountingDb,type AccountingTransaction} from "./db";
import {AccountingError} from "./access";
import {decimal,exactMoney,convertBase} from "./money";
import {readInventoryDocument} from "./inventory-documents";
import {assertPipelineManager,assertLoadingPipelineReady,registerStockBook} from "./loading-invoice-stock";
import {postJournalEntry} from "./postJournalEntry";
const hash=(x:unknown)=>createHash("sha256").update(JSON.stringify(x)).digest("hex");
export function allocatePurchaseBase(costs:string[],rate:string,digits:number){
  let sum=decimal("0"),previous=decimal("0");
  return costs.map(cost=>{
    sum=sum.plus(cost);const rounded=decimal(convertBase(sum.toFixed(),rate,digits));
    const amount=rounded.minus(previous);previous=rounded;
    if(!amount.gt(0))throw new AccountingError("Each actual carrying layer needs a positive base value",422,"BASE_VALUE_TOO_SMALL");
    return exactMoney(amount.toFixed(),digits);
  });
}
async function planWithin(tx:AccountingTransaction,companyId:number,documentId:number):Promise<CapitalizationPlan>{
  const doc=await readInventoryDocument(documentId,companyId,tx);
  const c=(await tx.execute(sql`select * from accounting_companies where id=${companyId}`)).rows[0];
  if(!c)throw new AccountingError("Company not found",404,"NOT_FOUND");
  const gate=(await tx.execute(sql`select * from accounting_inventory_capitalization_cutovers where company_id=${companyId}`)).rows[0];
  const old=(await tx.execute(sql`select * from accounting_inventory_capitalizations where document_id=${documentId}`)).rows[0];
  if(old){
    const stored=old.plan as unknown as CapitalizationPlan;
    const bookIds=(await tx.execute(sql`select id from accounting_stock_books where document_id=${documentId} order by line_index`)).rows.map(r=>Number(r.id));
    return {...stored,postingAllowed:false,posted:{id:Number(old.id),journalId:Number(old.journal_id),bookIds,reason:String(old.reason)}};
  }
  const blockers=new Set<CapitalizationPlan["blockers"][number]>();
  if(!c.is_active||!gate?.processing_ready)blockers.add("CAPITALIZATION_CLOSED");
  if(doc.status!=="approved")blockers.add("DOCUMENT_NOT_APPROVED");
  if(!(await tx.execute(sql`select id from accounting_fiscal_years where company_id=${companyId} and status='open'
    and starts_on<=${doc.documentDate}::date and ends_on>=${doc.documentDate}::date`)).rows.length)blockers.add("OPEN_PERIOD_REQUIRED");
  const stock=(await tx.execute(sql`select a.id from accounting_posting_rules p join accounting_accounts a on a.id=p.account_id
    where p.company_id=${companyId} and p.key='INVENTORY' and a.company_id=p.company_id and a.is_active and a.type='asset'`)).rows[0];
  if(!stock)blockers.add("STOCK_ACCOUNT_REQUIRED");
  const counter=(await tx.execute(doc.kind==="opening"?
    sql`select a.id,a.code,a.name_en as name,a.type from accounting_posting_rules p join accounting_accounts a on a.id=p.account_id
      where p.company_id=${companyId} and p.key='OPENING_BALANCE_EQUITY' and a.company_id=p.company_id and a.is_active and a.type='equity'`:
    sql`select a.id,a.code,a.name_en as name,a.type from accounting_accounts a where a.id=${gate?.purchase_payable_account_id??0}
      and a.company_id=${companyId} and a.is_active and a.type='liability'
      and not exists(select 1 from accounting_posting_rules p where p.company_id=${companyId} and p.account_id=a.id)`)).rows[0];
  if(!counter||counter.id===stock?.id)blockers.add("COUNTER_ACCOUNT_REQUIRED");
  const currencies=(await tx.execute(sql`select code,decimals from accounting_currencies where is_active and code in (${doc.currency},${String(c.base_currency)})`)).rows;
  const base=currencies.find(r=>r.code===c.base_currency);
  if(!base||!currencies.some(r=>r.code===doc.currency))blockers.add("INACTIVE_CURRENCY");
  let rate:CapitalizationPlan["rate"]=null;
  if(doc.currency===c.base_currency)rate={id:null,value:"1",effectiveOn:doc.documentDate,source:"base_currency"};
  else if(doc.kind==="opening")blockers.add("FOREIGN_OPENING_CARRYING_REQUIRED");
  else{
    const official=(await tx.execute(sql`select id,rate,effective_on::text from accounting_exchange_rates
      where company_id=${companyId} and currency=${doc.currency} and effective_on<=${doc.documentDate}::date
      order by effective_on desc limit 1`)).rows[0];
    if(official){
      const record=(await tx.execute(sql`select source from accounting_exchange_rates where id=${Number(official.id)}`)).rows[0];
      if(record.source==="central_bank")rate={id:Number(official.id),value:String(official.rate),effectiveOn:String(official.effective_on),source:"central_bank"};
    }
    if(!rate)blockers.add("OFFICIAL_RATE_REQUIRED");
  }
  if((await tx.execute(sql`select 1 from accounting_stock_books where document_id=${documentId}
    union all select 1 from accounting_journal_entries where company_id=${companyId}
      and source_id=${String(documentId)} and source_type=${doc.kind==="opening"?"InventoryOpening":"InventoryPurchase"} limit 1`)).rows.length)
    blockers.add("EXISTING_STOCK_PROOF");
  for(const l of doc.lines){
    if((await tx.execute(sql`select 1 from accounting_stock_consumptions used join accounting_stock_books b on b.id=used.layer_id
      join accounting_inventory_documents d on d.id=b.document_id where b.company_id=${companyId} and b.product_id=${l.productId}
      and (d.document_date,d.id,b.line_index)>(${doc.documentDate}::date,${documentId},${doc.lines.indexOf(l)}) limit 1`)).rows.length)
      blockers.add("BACKDATED_STOCK_RECONCILIATION_REQUIRED");
  }
  let values:string[]|null=null;
  if(rate&&base){
    try{values=allocatePurchaseBase(doc.lines.map(l=>l.totalCost),rate.value,Number(base.decimals));}
    catch(e){if(e instanceof AccountingError)blockers.add("BASE_VALUE_TOO_SMALL");else throw e;}
  }
  const plan:CapitalizationPlan={companyId,documentId,revision:doc.revision,reference:doc.reference,kind:doc.kind,
    documentDate:doc.documentDate,supplier:doc.supplier,evidenceReference:doc.evidenceReference,currency:doc.currency,baseCurrency:String(c.base_currency),
    nativeTotal:doc.totalCost,baseTotal:values?exactMoney(values.reduce((s,v)=>s.plus(v),decimal("0")).toFixed(),Number(base!.decimals)):null,
    rate,stockAccountId:stock?Number(stock.id):null,counterAccount:counter?{id:Number(counter.id),code:String(counter.code),name:String(counter.name),type:String(counter.type)}:null,
    lines:doc.lines.map((l,lineIndex)=>({lineIndex,productId:l.productId,productName:l.productName,batchReference:l.batchReference,
      quantityTons:l.quantityTons,nativeCost:l.totalCost,baseCost:values?.[lineIndex]??null})),
    blockers:[...blockers],postingAllowed:!blockers.size,planHash:"",posted:null};
  plan.planHash=hash({...plan,planHash:undefined});return plan;
}
export async function readCapitalizationWorkbench(input:unknown,callerTx?:AccountingTransaction):Promise<CapitalizationWorkbench>{
  const parsed=capitalizationQuerySchema.safeParse(input);
  if(!parsed.success)throw new AccountingError(parsed.error.issues[0].message);
  const {companyId}=parsed.data;
  const run=async(tx:AccountingTransaction)=>{
    if(!(await tx.execute(sql`select id from accounting_companies where id=${companyId}`)).rows.length)
      throw new AccountingError("Company not found",404,"NOT_FOUND");
    const docs=(await tx.execute(sql`select id from accounting_inventory_documents where company_id=${companyId} and status='approved' order by id desc`)).rows;
    const gate=(await tx.execute(sql`select processing_ready from accounting_inventory_capitalization_cutovers where company_id=${companyId}`)).rows[0];
    const rows:CapitalizationPlan[]=[];for(const d of docs)rows.push(await planWithin(tx,companyId,Number(d.id)));
    return {companyId,activationEnabled:gate?.processing_ready===true,rows,stockChanged:false as const};
  };
  return callerTx?run(callerTx):accountingDb.transaction(run,{isolationLevel:"repeatable read",accessMode:"read only"});
}
export async function capitalizeInventoryDocument(input:unknown,actor:AccountingAccess,callerTx?:AccountingTransaction){
  const parsed=capitalizationCommandSchema.safeParse(input);
  if(!parsed.success)throw new AccountingError(parsed.error.issues[0].message);
  const d=parsed.data;
  const run=async(tx:AccountingTransaction)=>{
    await tx.execute(sql`select pg_advisory_xact_lock(718392,0)`);
    await assertPipelineManager(tx,actor);await assertLoadingPipelineReady(tx);
    const triggers=(await tx.execute(sql`select tgname from pg_trigger where tgname in
      ('accounting_capitalization_header_guard','accounting_capitalization_evidence_guard','accounting_capitalization_cutover_guard')
      and tgenabled in ('O','A')`)).rows;
    if(triggers.length!==3)throw new AccountingError("Capitalization guards missing",503,"CAPITALIZATION_GUARDS_MISSING");
    const commandHash=hash(d);
    const old=(await tx.execute(sql`select * from accounting_inventory_capitalizations where document_id=${d.documentId} and company_id=${d.companyId}`)).rows[0];
    if(old){
      if(old.command_hash!==commandHash)throw new AccountingError("Capitalization command changed",409,"IDEMPOTENCY_CONFLICT");
      return {...(await planWithin(tx,d.companyId,d.documentId)).posted!,duplicate:true,stockChanged:false};
    }
    const plan=await planWithin(tx,d.companyId,d.documentId);
    if(plan.planHash!==d.expectedPlanHash)throw new AccountingError("Document or valuation changed; reload",409,"STALE_CAPITALIZATION_PLAN");
    if(!plan.postingAllowed)throw new AccountingError("Capitalization blocked: "+plan.blockers.join(", "),409,"CAPITALIZATION_BLOCKED");
    if(plan.rate?.id)await tx.execute(sql`select id from accounting_exchange_rates where id=${plan.rate.id} for share`);
    await tx.execute(sql`set constraints accounting_balance_header,accounting_balance_lines,accounting_capitalization_evidence_guard deferred`);
    const journal=await postJournalEntry({companyId:d.companyId,entryDate:plan.documentDate,
      sourceType:plan.kind==="opening"?"InventoryOpening":"InventoryPurchase",sourceId:String(plan.documentId),
      description:`${plan.reference} · ${d.reason}`,lines:[
        {accountId:plan.stockAccountId!,currency:plan.baseCurrency,debit:plan.baseTotal!},
        {accountId:plan.counterAccount!.id,currency:plan.currency,credit:plan.nativeTotal},
      ]},actor,tx);
    const bookIds:number[]=[];
    for(const line of plan.lines){
      const b=await registerStockBook({companyId:d.companyId,documentId:d.documentId,lineIndex:line.lineIndex,
        journalId:journal.entry.id,baseCost:line.baseCost!,evidenceReference:plan.evidenceReference},actor,tx);
      bookIds.push(b.id);
    }
    const saved=(await tx.execute(sql`insert into accounting_inventory_capitalizations(company_id,document_id,journal_id,command_hash,plan,actor_id,actor_type,reason)
      values(${d.companyId},${d.documentId},${journal.entry.id},${commandHash},${JSON.stringify(plan)}::jsonb,${actor.actorId},${actor.actorType},${d.reason}) returning id`)).rows[0];
    await tx.execute(sql`insert into accounting_audit_logs(company_id,actor_id,actor_type,action,entity_type,entity_id,after)
      values(${d.companyId},${actor.actorId},${actor.actorType},'capitalize_inventory','inventory_document',${String(d.documentId)},
        ${JSON.stringify({journalId:journal.entry.id,bookIds,reason:d.reason,stockChanged:false})}::jsonb)`);
    await tx.execute(sql`set constraints accounting_balance_header,accounting_balance_lines,accounting_capitalization_evidence_guard immediate`);
    return {id:Number(saved.id),journalId:journal.entry.id,bookIds,reason:d.reason,duplicate:false,stockChanged:false};
  };
  if(!callerTx)return accountingDb.transaction(run);
  const mark=sql.identifier("stock_capital_"+randomUUID().replaceAll("-",""));
  await callerTx.execute(sql`savepoint ${mark}`);
  try{const result=await run(callerTx);await callerTx.execute(sql`release savepoint ${mark}`);return result;}
  catch(e){await callerTx.execute(sql`rollback to savepoint ${mark}`);await callerTx.execute(sql`release savepoint ${mark}`);throw e;}
}
