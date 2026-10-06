import {createHash} from "node:crypto";
import {sql} from "drizzle-orm";
import {shipmentCostCommandSchema,shipmentCostFiltersSchema,type ShipmentCostPlan,type ShipmentCostWorkbench} from "@shared/accounting-shipment-costs";
import type {AccountingAccess} from "@shared/accounting-api";
import {accountingDb,type AccountingTransaction} from "./db";
import {AccountingError} from "./access";
import {assertPipelineManager} from "./loading-invoice-stock";
import {assertLedgerReady} from "./readiness";
import {calculateShipmentCost} from "./shipment-cost-calculation";
import {decimal,convertBase} from "./money";
import {postJournalEntry} from "./postJournalEntry";
import {operationalEventSchema,recordOperationalEvent} from "./events";
import {z} from "zod";

const obj=(v:unknown):Record<string,unknown>=>v&&typeof v==="object"&&!Array.isArray(v)?v as Record<string,unknown>:{};
async function planWithin(tx:AccountingTransaction,companyId:number,factId:number):Promise<ShipmentCostPlan>{
  const c=(await tx.execute(sql`select c.*,cur.decimals,(now() at time zone c.timezone)::date::text as today from accounting_companies c
    left join accounting_currencies cur on cur.code=c.base_currency and cur.is_active where c.id=${companyId}`)).rows[0];
  if(!c)throw new AccountingError("Accounting company not found",404,"NOT_FOUND");
  const f=(await tx.execute(sql`select * from accounting_operational_facts where company_id=${companyId}
    and id=${factId} and event_type='ShipmentCostRecorded'`)).rows[0];
  if(!f)throw new AccountingError("Shipment cost fact not found",404,"NOT_FOUND");
  const stored=(await tx.execute(sql`select * from accounting_shipment_costs where company_id=${companyId} and fact_id=${factId}`)).rows[0];
  if(stored)return {...stored.plan as ShipmentCostPlan,postingAllowed:false,
    posted:{id:Number(stored.id),journalId:Number(stored.journal_id),
      carrierPartyId:stored.carrier_party_id==null?null:Number(stored.carrier_party_id),reason:String(stored.reason)}};
  const p=obj(f.payload),input=obj(p.input),order=obj(p.order);
  const plan:ShipmentCostPlan={
    factId,orderId:Number(f.order_id),sourceId:String(f.source_id),planHash:"",
    loadingSourceId:typeof input.loadingSourceId==="string"?`${f.order_id}:${input.loadingSourceId}`:null,
    eventDate:typeof input.eventDate==="string"?input.eventDate:null,
    costType:input.costType==="EXTERNAL_CARRIER"||input.costType==="INTERNAL_FLEET"?input.costType:null,
    carrierReference:typeof input.carrierReference==="string"?input.carrierReference:null,
    costDocumentReference:typeof input.costDocumentReference==="string"?input.costDocumentReference:null,
    currency:input.costType==="INTERNAL_FLEET"?String(c.base_currency):typeof input.currency==="string"?input.currency:null,
    decimals:null,amount:null,baseAmount:null,baseCurrency:String(c.base_currency),
    rate:null,rateReference:null,rateEffectiveOn:null,fleetCostCenterId:null,
    fleetRate:null,fleetRateBasis:null,quantity:null,blockers:[],postingAllowed:false,posted:null,
  };
  const blocked=new Set<ShipmentCostPlan["blockers"][number]>();
  if(!c.is_active)blocked.add("COMPANY_INACTIVE");
  if(c.decimals==null)blocked.add("CURRENCY_REQUIRED");
  if(order.shippingMode!=="SELLER_ARRANGED")blocked.add("CUSTOMER_ARRANGED");
  const loading=plan.loadingSourceId?(await tx.execute(sql`select * from accounting_operational_facts
    where company_id=${companyId} and order_id=${Number(f.order_id)}
    and source_id=${plan.loadingSourceId} and event_type='LoadingCompleted'`)).rows[0]:null;
  if(!loading)blocked.add("LOADING_REQUIRED");
  const cur=(await tx.execute(sql`select decimals from accounting_currencies where code=${plan.currency} and is_active`)).rows[0];
  if(!cur)blocked.add("CURRENCY_REQUIRED");
  else plan.decimals=Number(cur.decimals);
  if(loading&&cur){
    try{
      if(input.orderId!==Number(f.order_id)||order.companyId!==companyId
        ||`${input.orderId}:${input.sourceId}`!==f.source_id)throw new Error("Invalid fact identity");
      Object.assign(plan,calculateShipmentCost(f.payload,loading.payload,String(c.base_currency),Number(cur.decimals)));
      if(plan.eventDate!>String(c.today))blocked.add("INVALID_CAPTURE");
    }catch{blocked.add("INVALID_CAPTURE");}
  }
  if(plan.fleetCostCenterId&&!(await tx.execute(sql`select 1 from accounting_cost_centers
    where id=${plan.fleetCostCenterId} and company_id=${companyId} and is_active`)).rows.length)
    blocked.add("FLEET_CENTER_REQUIRED");
  if(plan.amount&&c.decimals!=null){
    if(plan.currency===c.base_currency){plan.rate="1";plan.baseAmount=plan.amount;}
    else{
      const rate=(await tx.execute(sql`select rate::text,reference,effective_on::text,source
        from accounting_exchange_rates where company_id=${companyId} and currency=${plan.currency}
        and effective_on<=${plan.eventDate}::date order by effective_on desc limit 1`)).rows[0];
      if(!rate||rate.source!=="central_bank"||!String(rate.reference).trim())blocked.add("OFFICIAL_RATE_REQUIRED");
      else{
        plan.rate=String(rate.rate);plan.rateReference=String(rate.reference);plan.rateEffectiveOn=String(rate.effective_on);
        plan.baseAmount=convertBase(plan.amount,plan.rate,Number(c.decimals));
      }
    }
    if(plan.baseAmount&&!decimal(plan.baseAmount).gt(0))blocked.add("BASE_AMOUNT_ZERO");
  }
  // Never cast a malformed legacy date into SQL.
  if(plan.amount&&!(await tx.execute(sql`select 1 from accounting_fiscal_years where company_id=${companyId}
    and status='open' and ${plan.eventDate}::date between starts_on and ends_on`)).rows.length)blocked.add("PERIOD_CLOSED");
  const mappings=(await tx.execute(sql`select p.key,a.id,a.type from accounting_posting_rules p
    join accounting_accounts a on a.id=p.account_id and a.company_id=p.company_id and a.is_active
    where p.company_id=${companyId} and p.key in ('SHIPPING_EXPENSE','CARRIER_PAYABLE','FLEET_COST_ABSORBED')`)).rows;
  const expense=mappings.find(r=>r.key==="SHIPPING_EXPENSE"&&r.type==="expense");
  const credit=mappings.find(r=>r.key===(plan.costType==="INTERNAL_FLEET"?"FLEET_COST_ABSORBED":"CARRIER_PAYABLE")
    &&r.type===(plan.costType==="INTERNAL_FLEET"?"expense":"liability"));
  if(!expense||!credit||expense.id===credit.id)blocked.add("POSTING_MAPPING_REQUIRED");
  const gate=(await tx.execute(sql`select *,starts_on::text from accounting_shipment_cutovers where company_id=${companyId}`)).rows[0];
  if(!gate?.processing_ready||!plan.eventDate||!gate.starts_on||plan.eventDate<String(gate.starts_on))blocked.add("CUTOVER_CLOSED");
  if(plan.currency!==c.base_currency&&!gate?.foreign_processing_ready)blocked.add("FOREIGN_CUTOVER_CLOSED");
  plan.blockers=[...blocked];
  plan.planHash=createHash("sha256").update(JSON.stringify({
    plan,expenseAccountId:expense?.id??null,creditAccountId:credit?.id??null,
    baseDecimals:c.decimals??null,cutoverStartsOn:gate?.starts_on??null,
  })).digest("hex");
  return plan;
}
export async function readShipmentCosts(input:unknown,callerTx?:AccountingTransaction):Promise<ShipmentCostWorkbench>{
  const parsed=shipmentCostFiltersSchema.safeParse(input);
  if(!parsed.success)throw new AccountingError(parsed.error.issues[0].message);
  const f=parsed.data;
  const run=async(tx:AccountingTransaction)=>{
    const c=(await tx.execute(sql`select id,name,base_currency as "baseCurrency" from accounting_companies where id=${f.companyId}`)).rows[0];
    if(!c)throw new AccountingError("Accounting company not found",404,"NOT_FOUND");
    const condition=sql`company_id=${f.companyId} and event_type='ShipmentCostRecorded'
      ${f.orderId?sql`and order_id=${f.orderId}`:sql``}`;
    const count=(await tx.execute(sql`select count(*)::integer as n from accounting_operational_facts where ${condition}`)).rows[0];
    const facts=(await tx.execute(sql`select id from accounting_operational_facts where ${condition}
      order by id desc limit ${f.pageSize} offset ${(f.page-1)*f.pageSize}`)).rows;
    const rows:ShipmentCostPlan[]=[];
    for(const fact of facts)rows.push(await planWithin(tx,f.companyId,Number(fact.id)));
    return {company:{id:Number(c.id),name:String(c.name),baseCurrency:String(c.baseCurrency)},rows,
      pagination:{page:f.page,pageSize:f.pageSize,totalRows:Number(count.n)},activationEnabled:false as const};
  };
  return callerTx?run(callerTx):accountingDb.transaction(run,{isolationLevel:"repeatable read",accessMode:"read only"});
}
export async function readShipmentPostingPlan(companyId:number,factId:number,tx:AccountingTransaction){
  return planWithin(tx,companyId,factId);
}
export async function postShipmentCost(input:unknown,actor:AccountingAccess,callerTx?:AccountingTransaction){
  const parsed=shipmentCostCommandSchema.safeParse(input);
  if(!parsed.success)throw new AccountingError(parsed.error.issues[0].message);
  const data=parsed.data,hash=createHash("sha256").update(JSON.stringify(data)).digest("hex");
  const run=async(tx:AccountingTransaction)=>{
    await tx.execute(sql`select pg_advisory_xact_lock(718392,0)`);
    await assertPipelineManager(tx,actor);await assertLedgerReady(tx);
    const guards=(await tx.execute(sql`select t.tgname from pg_trigger t join pg_class c on c.oid=t.tgrelid
      join pg_namespace n on n.oid=c.relnamespace where n.nspname='public'
      and c.relname in ('accounting_shipment_costs','accounting_shipment_cutovers','accounting_journal_entries')
      and t.tgname in ('accounting_shipment_cost_guard','accounting_shipment_reversal_guard',
        'accounting_shipment_cutover_guard','accounting_shipment_provenance_guard')
      and t.tgenabled in ('O','A') and not t.tgisinternal`)).rows;
    if(guards.length!==4)throw new AccountingError("Shipment financial guards are missing",503,"SHIPMENT_GUARDS_MISSING");
    const existing=(await tx.execute(sql`select id,journal_id,command_hash from accounting_shipment_costs
      where company_id=${data.companyId} and fact_id=${data.factId}`)).rows[0];
    if(existing){
      if(existing.command_hash!==hash)throw new AccountingError("Shipment command identity cannot be changed",409,"IDEMPOTENCY_CONFLICT");
      return {id:Number(existing.id),journalId:Number(existing.journal_id),duplicate:true};
    }
    const plan=await planWithin(tx,data.companyId,data.factId);
    if(plan.blockers.length)throw new AccountingError(`Shipment cost is blocked: ${plan.blockers.join(", ")}`,409,"SHIPMENT_NOT_READY");
    if(plan.planHash!==data.expectedPlanHash)
      throw new AccountingError("Shipment valuation has changed; reload and review the updated plan",409,"SHIPMENT_PLAN_CHANGED");
    if((plan.costType==="EXTERNAL_CARRIER")!==(data.carrierPartyId!==null))
      throw new AccountingError("External costs require an explicit accounting carrier party; internal costs must not use one");
    const rules=(await tx.execute(sql`select key,account_id from accounting_posting_rules where company_id=${data.companyId}
      and key in ('SHIPPING_EXPENSE','CARRIER_PAYABLE','FLEET_COST_ABSORBED')`)).rows;
    const account=(key:string)=>Number(rules.find(r=>r.key===key)!.account_id);
    const creditKey=plan.costType==="EXTERNAL_CARRIER"?"CARRIER_PAYABLE":"FLEET_COST_ABSORBED";
    const party=plan.costType==="EXTERNAL_CARRIER"?{partyType:"carrier" as const,partyId:data.carrierPartyId!}:{};
    const journal=await postJournalEntry({
      companyId:data.companyId,entryDate:plan.eventDate!,description:data.reason,
      sourceType:"ShipmentCostRecorded",sourceId:plan.sourceId,
      lines:[
        {accountId:account("SHIPPING_EXPENSE"),currency:plan.currency!,debit:plan.amount!,credit:"0",
          costCenterId:plan.fleetCostCenterId,...party},
        {accountId:account(creditKey),currency:plan.currency!,debit:"0",credit:plan.amount!,
          costCenterId:plan.fleetCostCenterId,...party},
      ],
    },actor,tx);
    if(journal.duplicate)throw new AccountingError("An existing journal cannot be adopted without its original shipment command",409,"SHIPMENT_JOURNAL_CONFLICT");
    const row=(await tx.execute(sql`insert into accounting_shipment_costs(company_id,fact_id,journal_id,
      carrier_party_id,reason,command_hash,plan,actor_id,actor_type) values(${data.companyId},${data.factId},
      ${journal.entry.id},${data.carrierPartyId},${data.reason},${hash},${JSON.stringify(plan)}::jsonb,${actor.actorId},${actor.actorType})
      returning id`)).rows[0];
    await tx.execute(sql`insert into accounting_audit_logs(company_id,actor_id,actor_type,action,entity_type,entity_id,"after")
      values(${data.companyId},${actor.actorId},${actor.actorType},'post_shipment_cost','shipment_cost',${String(row.id)},
      ${JSON.stringify({factId:data.factId,journalId:journal.entry.id,carrierPartyId:data.carrierPartyId,reason:data.reason})}::jsonb)`);
    return {id:Number(row.id),journalId:journal.entry.id,duplicate:false};
  };
  return callerTx?run(callerTx):accountingDb.transaction(run);
}
const shipmentCaptureSchema=z.object({
  companyId:z.number().int().positive().max(2147483647),
  event:operationalEventSchema.refine(e=>e.eventType==="ShipmentCostRecorded","A shipment cost event is required"),
}).strict();
export async function captureShipmentCost(input:unknown,actor:AccountingAccess,callerTx?:AccountingTransaction){
  const parsed=shipmentCaptureSchema.safeParse(input);
  if(!parsed.success)throw new AccountingError(parsed.error.issues[0].message);
  const data=parsed.data;
  const run=async(tx:AccountingTransaction)=>{
    await tx.execute(sql`select pg_advisory_xact_lock(718392,0)`);
    await assertPipelineManager(tx,actor);
    const order=(await tx.execute(sql`select coalesce(o.accounting_company_id,b.company_id) as company_id
      from customer_orders o left join accounting_source_bindings b on b.source_module='shop' and b.capture_enabled
      where o.id=${data.event.orderId} for share of o`)).rows[0];
    if(!order||order.company_id!==data.companyId)throw new AccountingError("Order does not belong to the selected accounting company",409,"ORDER_SCOPE");
    const company=(await tx.execute(sql`select (now() at time zone timezone)::date::text as today
      from accounting_companies where id=${data.companyId} and is_active`)).rows[0];
    if(!company||data.event.eventDate>String(company.today))throw new AccountingError("Active company and a nonfuture shipment date required");
    return recordOperationalEvent(tx,data.event,actor);
  };
  return callerTx?run(callerTx):accountingDb.transaction(run);
}
