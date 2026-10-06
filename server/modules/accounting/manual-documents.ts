import {sql} from "drizzle-orm";
import {z} from "zod";
import {accountingDb,type AccountingTransaction} from "./db";
import {AccountingError} from "./access";
import {assertLedgerReady} from "./readiness";
import {decimal,exactMoney} from "./money";
import {postJournalEntry,reverseJournalEntry} from "./postJournalEntry";
import type {AccountingAccess} from "@shared/accounting-api";
import {manualDocumentSchema,saveManualDocumentSchema,manualDocumentFiltersSchema,manualDocumentActionSchema,reverseManualDocumentSchema,
   type ManualDocumentInput,type ManualDocumentMetadata,type ManualDocumentPreview,type ManualDocumentRow,type ManualDocumentDetail,type ManualDocumentList,type ForeignExpenseValuation} from "@shared/accounting-documents";
const queryId=z.coerce.number().int().positive().max(2147483647);
const allowedKeys=["BANK","CASH","BANK_FEES","SHIPPING_EXPENSE"];
function parse<T>(schema:z.ZodType<T,z.ZodTypeDef,unknown>,input:unknown):T{
  const p=schema.safeParse(input);if(!p.success)throw new AccountingError(p.error.issues[0].message);return p.data;
}
function manage(actor:AccountingAccess){
  if(!actor.canManage)throw new AccountingError("Management permission required",403,"ACCESS_DENIED");
  if(!Number.isSafeInteger(actor.actorId)||actor.actorId<=0||!["admin","custom"].includes(actor.actorType))
    throw new AccountingError("Verified staff actor required",403,"ACCESS_DENIED");
}
function read<T>(run:(tx:AccountingTransaction)=>Promise<T>,tx?:AccountingTransaction){
  return tx?run(tx):accountingDb.transaction(run,{isolationLevel:"repeatable read",accessMode:"read only"});
}
function write<T>(actor:AccountingAccess,run:(tx:AccountingTransaction)=>Promise<T>,tx?:AccountingTransaction){
  manage(actor);
  const locked=async(inner:AccountingTransaction)=>{
    await inner.execute(sql`select pg_advisory_xact_lock(718392,0)`);
    await assertLedgerReady(inner);return run(inner);
  };
  return tx?locked(tx):accountingDb.transaction(locked);
}
export async function readManualMetadata(company:unknown,callerTx?:AccountingTransaction):Promise<ManualDocumentMetadata>{
  const id=parse(queryId,company);
  return read(async tx=>{
    const c=(await tx.execute(sql`select c.id,c.name,c.base_currency,c.is_active,cur.decimals,cur.is_active as currency_active,
      coalesce(m.processing_ready,false) as manual_ready,
      coalesce(r.processing_ready,false) and coalesce(w.pipeline_ready,false) as pipeline_ready
      from accounting_companies c join accounting_currencies cur on cur.code=c.base_currency
      left join accounting_manual_cutovers m on m.company_id=c.id
      left join accounting_receipt_cutovers r on r.company_id=c.id
      left join accounting_wallet_cutovers w on w.company_id=c.id where c.id=${id}`)).rows[0];
    if(!c)throw new AccountingError("Accounting company not found",404,"NOT_FOUND");
    let core=true;try{await assertLedgerReady(tx);}catch(e){
      if(e instanceof AccountingError&&e.code==="LEDGER_GUARDS_MISSING")core=false;else throw e;
    }
    const guards=(await tx.execute(sql`select count(*)::integer n from pg_trigger t join pg_class c on c.oid=t.tgrelid
      join pg_namespace ns on ns.oid=c.relnamespace where ns.nspname='public' and not t.tgisinternal and t.tgenabled in ('O','A')
      and ((t.tgname='accounting_guard_manual_document' and c.relname='accounting_manual_documents')
        or (t.tgname='accounting_manual_complete' and c.relname in ('accounting_manual_documents','accounting_journal_entries')))`)).rows[0].n;
    const ledgerGuardsReady=core&&guards===3;
    const foreignGuards=(await tx.execute(sql`select count(*)::integer n from pg_trigger t join pg_class c on c.oid=t.tgrelid
      join pg_namespace ns on ns.oid=c.relnamespace where ns.nspname='public' and not t.tgisinternal and t.tgenabled in ('O','A')
      and ((t.tgname='accounting_manual_expense_book_guard' and c.relname='accounting_manual_expense_books')
        or (t.tgname='accounting_assert_manual_expense_book' and c.relname='accounting_journal_entries')
        or (t.tgname='accounting_manual_expense_book_used' and c.relname in ('accounting_manual_documents','accounting_manual_expense_books')))`)).rows[0].n;
    const currencies=(await tx.execute(sql`select code,decimals from accounting_currencies where is_active order by code`)).rows as ManualDocumentMetadata["currencies"];
    const accounts=(await tx.execute(sql`select a.id,a.code,a.name_fa as "nameFa",a.name_ar as "nameAr",a.name_en as "nameEn",a.type,
      exists(select 1 from accounting_posting_rules p where p.company_id=a.company_id and p.account_id=a.id and p.key in ('BANK','CASH')) as funding
      from accounting_accounts a where a.company_id=${id} and a.is_active and a.is_posting
        and not exists(select 1 from accounting_posting_rules p where p.company_id=a.company_id and p.account_id=a.id
          and p.key not in (${sql.join(allowedKeys.map(k=>sql`${k}`),sql`, `)}))
      order by a.code,a.id`)).rows as unknown as ManualDocumentMetadata["accounts"];
    const costCenters=(await tx.execute(sql`select id,code,name_fa as "nameFa",name_ar as "nameAr",name_en as "nameEn"
      from accounting_cost_centers where company_id=${id} and is_active order by code,id`)).rows as unknown as ManualDocumentMetadata["costCenters"];
    const fiscalPeriods=(await tx.execute(sql`select id,name,starts_on::text as "startsOn",ends_on::text as "endsOn",status
      from accounting_fiscal_years where company_id=${id} order by starts_on,id`)).rows as unknown as ManualDocumentMetadata["fiscalPeriods"];
    return {company:{id:Number(c.id),name:String(c.name),baseCurrency:String(c.base_currency),isActive:c.is_active===true},
      currencyDecimals:Number(c.decimals),currencyActive:c.currency_active===true,
      manualCutoverReady:c.manual_ready===true,pipelineReady:c.pipeline_ready===true,ledgerGuardsReady,
      postingReady:c.is_active===true&&c.currency_active===true&&c.manual_ready===true&&c.pipeline_ready===true&&ledgerGuardsReady,
       accounts,costCenters,fiscalPeriods,baseCurrencyOnly:false,currencies,foreignExpenseReady:ledgerGuardsReady&&foreignGuards===4};
  },callerTx);
}
export function normalizeManualDocument(input:unknown):ManualDocumentInput{
  const d=parse(manualDocumentSchema,input);
  return {...d,lines:d.lines.map(l=>({...l,debit:decimal(l.debit).toFixed(),credit:decimal(l.credit).toFixed()}))};
}
export function evaluateManualDocument(d:ManualDocumentInput,meta:ManualDocumentMetadata):ManualDocumentPreview{
  if(d.companyId!==meta.company.id)throw new AccountingError("Document company does not match metadata",409,"COMPANY_MISMATCH");
  const currency=d.currency??meta.company.baseCurrency;
  if(currency!==meta.company.baseCurrency&&d.kind!=="expense")
    throw new AccountingError("General manual journals remain base-currency only",422,"FOREIGN_EXPENSE_ONLY");
  const digits=currency===meta.company.baseCurrency?meta.currencyDecimals:meta.currencies.find(c=>c.code===currency)?.decimals;
  if(digits===undefined)throw new AccountingError("Select an active accounting currency",409,"CURRENCY_INACTIVE");
  let debit=decimal("0"),credit=decimal("0");
  for(const l of d.lines){
    const a=meta.accounts.find(a=>a.id===l.accountId);
    if(!a)throw new AccountingError("Select a safe active posting account in this company",409,"ACCOUNT_NOT_ALLOWED");
    if(l.costCenterId&&!meta.costCenters.some(c=>c.id===l.costCenterId))
      throw new AccountingError("Select an active cost center in this company",409,"COST_CENTER_MISMATCH");
    const dr=decimal(exactMoney(l.debit,digits)),cr=decimal(exactMoney(l.credit,digits));
    if(dr.gt(0)===cr.gt(0))throw new AccountingError("Each line requires exactly one positive debit or credit",422,"LINE_SIDE_REQUIRED");
    debit=debit.plus(dr);credit=credit.plus(cr);
  }
  if(!debit.gt(0)||!credit.gt(0))throw new AccountingError("At least one debit and credit line required",422,"LINE_SIDE_REQUIRED");
  // Total storage has the same upper bound as persisted journal amounts.
   exactMoney(debit.toFixed(),digits);exactMoney(credit.toFixed(),digits);
  if(d.kind==="expense"){
    const [expense,funding]=d.lines;
    if(d.lines.length!==2||meta.accounts.find(a=>a.id===expense.accountId)?.type!=="expense"||!expense.costCenterId
      ||!meta.accounts.find(a=>a.id===funding.accountId)?.funding||!decimal(expense.debit).gt(0)||!decimal(funding.credit).gt(0)
      ||!debit.eq(credit))throw new AccountingError("Paid expense requires equal expense debit with cost center and bank/cash credit",422,"EXPENSE_REQUIRED");
  }
  return {currency,debit:debit.toFixed(),credit:credit.toFixed(),difference:debit.minus(credit).toFixed(),
    balanced:debit.eq(credit),periodOpen:meta.fiscalPeriods.some(p=>p.status==="open"&&p.startsOn<=d.entryDate&&p.endsOn>=d.entryDate)};
}
export async function previewManualDocument(input:unknown,tx?:AccountingTransaction){
  const d=normalizeManualDocument(input);
  return read(async inner=>{
    const meta=await readManualMetadata(d.companyId,inner),p=evaluateManualDocument(d,meta);
    if(p.currency!==meta.company.baseCurrency)p.foreignExpense=await foreignValuation(inner,d);
    return p;
  },tx);
}
async function foreignValuation(tx:AccountingTransaction,document:ManualDocumentInput):Promise<ForeignExpenseValuation>{
  return (await tx.execute(sql`select accounting_manual_expense_valuation(${JSON.stringify(document)}::jsonb) value`)).rows[0].value as ForeignExpenseValuation;
}
const rowColumns=sql`d.id,d.company_id as "companyId",d.source_id as "sourceId",d.kind,d.input->>'entryDate' as "entryDate",
  d.input->>'description' as description,d.input->>'evidenceReference' as "evidenceReference",
  case when d.reversal_journal_id is not null then 'reversed' else d.status end as status,d.revision,
  d.journal_id as "journalId",d.reversal_journal_id as "reversalJournalId",d.currency,d.debit::text as debit,d.credit::text as credit`;
export async function readManualDocuments(input:unknown,tx?:AccountingTransaction):Promise<ManualDocumentList>{
  const f=parse(manualDocumentFiltersSchema,input),clauses=[sql`d.company_id=${f.companyId}`];
  if(f.kind)clauses.push(sql`d.kind=${f.kind}`);
  if(f.status)clauses.push(f.status==="reversed"?sql`d.reversal_journal_id is not null`:
    f.status==="posted"?sql`d.status='posted' and d.reversal_journal_id is null`:sql`d.status=${f.status}`);
  if(f.q)clauses.push(sql`(d.input->>'description' ilike ${"%"+f.q+"%"} or d.source_id ilike ${"%"+f.q+"%"}
    or d.input->>'evidenceReference' ilike ${"%"+f.q+"%"})`);
  if(f.from)clauses.push(sql`d.input->>'entryDate'>=${f.from} and d.input->>'entryDate'<=${f.to}`);
  return read(async inner=>{
    const metadata=await readManualMetadata(f.companyId,inner),scope=sql.join(clauses,sql` and `);
    const totalRows=Number((await inner.execute(sql`select count(*)::text n from accounting_manual_documents d where ${scope}`)).rows[0].n);
    const items=(await inner.execute(sql`select ${rowColumns} from accounting_manual_documents d where ${scope}
      order by d.input->>'entryDate' desc,d.id desc limit ${f.pageSize} offset ${(f.page-1)*f.pageSize}`)).rows as unknown as ManualDocumentRow[];
    return {metadata,items,totalRows,page:f.page,pageSize:f.pageSize};
  },tx);
}
async function get(tx:AccountingTransaction,id:number,companyId:number){
  const d=(await tx.execute(sql`select * from accounting_manual_documents where id=${id} and company_id=${companyId}`)).rows[0];
  if(!d)throw new AccountingError("Document not found in selected company",404,"NOT_FOUND");return d;
}
export async function readManualDocument(id:unknown,companyId:unknown,tx?:AccountingTransaction):Promise<ManualDocumentDetail>{
  const docId=parse(queryId,id),company=parse(queryId,companyId);
  return read(async inner=>{
    const d=await get(inner,docId,company),document=parse(manualDocumentSchema,d.input),metadata=await readManualMetadata(company,inner);
    const row=(await inner.execute(sql`select ${rowColumns} from accounting_manual_documents d where d.id=${docId} and d.company_id=${company}`)).rows[0] as unknown as ManualDocumentRow;
    // Preserve readable history even if an account/center/period was retired after posting.
     const preview:ManualDocumentPreview={currency:String(d.currency),debit:String(d.debit),credit:String(d.credit),
      difference:decimal(String(d.debit)).minus(String(d.credit)).toFixed(),balanced:decimal(String(d.debit)).eq(String(d.credit)),
      periodOpen:metadata.fiscalPeriods.some(p=>p.status==="open"&&p.startsOn<=document.entryDate&&p.endsOn>=document.entryDate)};
    const history=(await inner.execute(sql`select id,action,actor_type as "actorType",
      coalesce(after->>'entryDate',after->'document'->>'entryDate',before->'document'->>'entryDate','') as "entryDate",created_at::text as "createdAt",
      coalesce(after->>'reason',after->'document'->>'description',before->'document'->>'description','') as reason,
      coalesce(after->>'evidenceReference',after->'document'->>'evidenceReference',before->'document'->>'evidenceReference','') as "evidenceReference",
      (after->>'journalId')::integer as "journalId"
      from accounting_audit_logs where company_id=${company} and entity_type='manual-document' and entity_id=${String(docId)} order by id`)).rows as unknown as ManualDocumentDetail["history"];
    const postedLines=d.journal_id?(await inner.execute(sql`select account_id as "accountId",currency,debit::text,credit::text,
      base_debit::text as "baseDebit",base_credit::text as "baseCredit",exchange_rate::text as "exchangeRate",
      cost_center_id as "costCenterId",description from accounting_journal_lines where entry_id=${d.journal_id as number} order by id`)).rows:[];
     const proof=(await inner.execute(sql`select valuation from accounting_manual_expense_books where document_id=${docId}`)).rows[0];
     const foreignExpense=proof?.valuation as ForeignExpenseValuation|undefined;
     if(row.currency!==metadata.company.baseCurrency)
       preview.foreignExpense=foreignExpense??await foreignValuation(inner,document);
     const journalAccounts=d.journal_id?(await inner.execute(sql`select distinct a.id,a.code,a.type,a.name_fa as "nameFa",a.name_ar as "nameAr",a.name_en as "nameEn",false as funding
       from accounting_accounts a join accounting_journal_lines l on l.account_id=a.id where l.entry_id=${d.journal_id as number}`)).rows as unknown as ManualDocumentDetail["journalAccounts"]:undefined;
     return {metadata,row,document,preview,history,postedLines:postedLines as unknown as ManualDocumentDetail["postedLines"],foreignExpense,journalAccounts};
  },tx);
}
async function audit(tx:AccountingTransaction,actor:AccountingAccess,companyId:number,id:number,action:string,before:unknown,after:unknown){
  await tx.execute(sql`insert into accounting_audit_logs(company_id,actor_id,actor_type,action,entity_type,entity_id,before,after)
    values(${companyId},${actor.actorId},${actor.actorType},${action},'manual-document',${String(id)},
      ${JSON.stringify(before)}::jsonb,${JSON.stringify(after)}::jsonb)`);
}
function same(a:unknown,b:unknown){return JSON.stringify(normalizeManualDocument(a))===JSON.stringify(normalizeManualDocument(b));}
function revision(d:Record<string,unknown>,expected:number){
  if(Number(d.revision)!==expected)throw new AccountingError("Document changed; reload before editing or posting",409,"STALE_REVISION");
}
export async function saveManualDocument(input:unknown,actor:AccountingAccess,tx?:AccountingTransaction){
  manage(actor);
  const f=parse(saveManualDocumentSchema,input),document=normalizeManualDocument(f.document);
  return write(actor,async inner=>{
    const meta=await readManualMetadata(document.companyId,inner);
    if(!meta.company.isActive||!meta.currencyActive)throw new AccountingError("Active company and base currency required",409,"COMPANY_INACTIVE");
    const p=evaluateManualDocument(document,meta);
    if(f.id){
      const d=await get(inner,f.id,document.companyId);
      if(d.status!=="draft")throw new AccountingError("Only drafts may be edited",409,"IMMUTABLE_DOCUMENT");
      if(Number(d.revision)===f.revision!+1&&same(d.input,document))return {id:f.id,duplicate:true};
      revision(d,f.revision!);
      if(d.source_id!==document.sourceId)throw new AccountingError("Source identity is immutable",409,"IDEMPOTENCY_CONFLICT");
       await inner.execute(sql`update accounting_manual_documents set input=${JSON.stringify(document)}::jsonb,kind=${document.kind},currency=${p.currency},
        debit=${p.debit},credit=${p.credit},revision=revision+1 where id=${f.id}`);
      await audit(inner,actor,document.companyId,f.id,"draft-edited",{document:d.input,revision:d.revision},{document,revision:f.revision!+1});
      return {id:f.id,duplicate:false};
    }
    const existing=(await inner.execute(sql`select * from accounting_manual_documents where company_id=${document.companyId} and source_id=${document.sourceId}`)).rows[0];
    if(existing){
      if(existing.status==="discarded"||!same(existing.input,document))throw new AccountingError("Source identity was reused for different data",409,"IDEMPOTENCY_CONFLICT");
      return {id:Number(existing.id),duplicate:true};
    }
    const id=Number((await inner.execute(sql`insert into accounting_manual_documents(company_id,source_id,kind,input,currency,debit,credit)
      values(${document.companyId},${document.sourceId},${document.kind},${JSON.stringify(document)}::jsonb,${p.currency},${p.debit},${p.credit}) returning id`)).rows[0].id);
    await audit(inner,actor,document.companyId,id,"draft-created",null,{document,revision:1});return {id,duplicate:false};
  },tx);
}
async function ready(tx:AccountingTransaction,company:number){
  const meta=await readManualMetadata(company,tx);
  if(!meta.postingReady)throw new AccountingError("Manual financial activation remains closed",409,"MANUAL_CUTOVER_REQUIRED");
  return meta;
}
export async function postManualDocument(id:unknown,input:unknown,actor:AccountingAccess,tx?:AccountingTransaction){
  manage(actor);
  const docId=parse(queryId,id),f=parse(manualDocumentActionSchema,input);
  return write(actor,async inner=>{
    const meta=await ready(inner,f.companyId),d=await get(inner,docId,f.companyId);
    if(d.status==="posted"&&Number(d.revision)===f.revision+1)return {id:docId,journalId:Number(d.journal_id),duplicate:true};
    revision(d,f.revision);
    if(d.status!=="draft")throw new AccountingError("Only drafts may be posted",409,"IMMUTABLE_DOCUMENT");
    const doc=normalizeManualDocument(d.input),p=evaluateManualDocument(doc,meta);
    if(!p.balanced||!p.periodOpen)throw new AccountingError("Balanced document and open fiscal period required",409,"POSTING_NOT_READY");
     let journalLines=doc.lines.map(l=>({...l,currency:p.currency}));
     await inner.execute(sql`set constraints accounting_manual_complete,accounting_manual_expense_book_used deferred`);
     if(p.currency!==meta.company.baseCurrency){
       if(!meta.foreignExpenseReady)throw new AccountingError("Foreign expense integrity guards are unavailable",409,"FOREIGN_EXPENSE_NOT_READY");
       const valuation=await foreignValuation(inner,doc);
       if(!valuation.available)throw new AccountingError(`Foreign expense valuation unavailable: ${valuation.blockingReason}`,409,valuation.blockingReason??"FOREIGN_EXPENSE_NOT_READY");
       const book=(await inner.execute(sql`insert into accounting_manual_expense_books(document_id) values(${docId}) returning valuation`)).rows[0];
       journalLines=(book.valuation as ForeignExpenseValuation).lines!.map(l=>({
         accountId:l.accountId,currency:l.currency,debit:l.debit,credit:l.credit,costCenterId:l.costCenterId,description:l.description,
       }));
     }
    const result=await postJournalEntry({companyId:f.companyId,sourceType:doc.kind==="expense"?"ManualExpense":"ManualJournal",
      sourceId:doc.sourceId,entryDate:doc.entryDate,description:doc.description,
       lines:journalLines},actor,inner);
    await inner.execute(sql`update accounting_manual_documents set status='posted',journal_id=${result.entry.id},revision=revision+1 where id=${docId}`);
     await inner.execute(sql`set constraints accounting_manual_complete,accounting_manual_expense_book_used immediate`);
    await audit(inner,actor,f.companyId,docId,"document-posted",{revision:d.revision},{document:doc,journalId:result.entry.id,revision:f.revision+1});
    return {id:docId,journalId:result.entry.id,duplicate:result.duplicate};
  },tx);
}
export async function discardManualDocument(id:unknown,input:unknown,actor:AccountingAccess,tx?:AccountingTransaction){
  manage(actor);
  const docId=parse(queryId,id),f=parse(manualDocumentActionSchema,input);
  return write(actor,async inner=>{
    const d=await get(inner,docId,f.companyId);
    if(d.status==="discarded"&&Number(d.revision)===f.revision+1)return {id:docId,duplicate:true};
    revision(d,f.revision);
    if(d.status!=="draft")throw new AccountingError("Only drafts may be discarded",409,"IMMUTABLE_DOCUMENT");
    await inner.execute(sql`update accounting_manual_documents set status='discarded',revision=revision+1 where id=${docId}`);
    await audit(inner,actor,f.companyId,docId,"draft-discarded",{document:d.input,revision:d.revision},{entryDate:(d.input as ManualDocumentInput).entryDate,revision:f.revision+1});
    return {id:docId,duplicate:false};
  },tx);
}
export async function reverseManualDocument(id:unknown,input:unknown,actor:AccountingAccess,tx?:AccountingTransaction){
  manage(actor);
  const docId=parse(queryId,id),f=parse(reverseManualDocumentSchema,input);
  return write(actor,async inner=>{
     const meta=await ready(inner,f.companyId);const d=await get(inner,docId,f.companyId),doc=parse(manualDocumentSchema,d.input);
     if(d.currency!==meta.company.baseCurrency&&!meta.foreignExpenseReady)
       throw new AccountingError("Foreign expense integrity guards are unavailable",409,"FOREIGN_EXPENSE_NOT_READY");
    if(d.reversal_journal_id){
      const proof=d.reversal_evidence as {entryDate:string;reason:string;evidenceReference:string};
      if(Number(d.revision)===f.revision+1&&proof.entryDate===f.entryDate&&proof.reason===f.reason&&proof.evidenceReference===f.evidenceReference)
        return {id:docId,journalId:Number(d.reversal_journal_id),duplicate:true};
      throw new AccountingError("Document already reversed",409,"IDEMPOTENCY_CONFLICT");
    }
    revision(d,f.revision);
    if(d.status!=="posted"||!d.journal_id)throw new AccountingError("Only this document's posted journal may be reversed",409,"INVALID_REVERSAL");
    if(f.entryDate<doc.entryDate)throw new AccountingError("Reversal cannot predate the document",409,"INVALID_REVERSAL");
     await inner.execute(sql`set constraints accounting_manual_complete,accounting_manual_expense_book_used deferred`);
    const result=await reverseJournalEntry(Number(d.journal_id),f.entryDate,f.reason,actor,inner);
    const evidence={entryDate:f.entryDate,reason:f.reason,evidenceReference:f.evidenceReference};
    await inner.execute(sql`update accounting_manual_documents set reversal_journal_id=${result.entry.id},
      reversal_evidence=${JSON.stringify(evidence)}::jsonb,revision=revision+1 where id=${docId}`);
     await inner.execute(sql`set constraints accounting_manual_complete,accounting_manual_expense_book_used immediate`);
    await audit(inner,actor,f.companyId,docId,"document-reversed",{revision:d.revision},{...evidence,journalId:result.entry.id,revision:f.revision+1});
    return {id:docId,journalId:result.entry.id,duplicate:result.duplicate};
  },tx);
}