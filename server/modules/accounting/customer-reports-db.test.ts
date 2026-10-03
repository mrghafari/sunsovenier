import test from "node:test";
import assert from "node:assert/strict";
import {randomInt,randomUUID} from "node:crypto";
import {sql} from "drizzle-orm";
import {accountingDb} from "./db";
import {pool} from "../../db";
import {iraqChart} from "./iraq-chart";
import {postJournalEntry,reverseJournalEntry} from "./postJournalEntry";
import {recordCustomerReceipt,registerInvoiceReceivable,returnCustomerReceipt,transitionCheque} from "./receipts";
import {settleWalletReceivable} from "./wallet-settlement";
import {readCustomerReport} from "./customer-reports";
import {customerReportCsv} from "./customer-report-csv";
import {Money} from "./money";
import {readReceiptList,readReceiptDetail,readReceiptCustomers,readReceiptOpenItems} from "./receipt-workbench";
import {receiptListCsv} from "./receipt-workbench-csv";

test("customer statements and historical aging (rollback-only)",{skip:process.env.ACCOUNTING_DB_TEST!=="1"},async t=>{
  const rollback=new Error("ROLLBACK_CUSTOMER_REPORTS");let complete=false;
  try{await accountingDb.transaction(async tx=>{
    await tx.execute(sql`select pg_advisory_xact_lock(718392,0)`);
    const company=Number((await tx.execute(sql`insert into accounting_companies(name,country_code,timezone,base_currency)
      values('Rollback customer reports','IQ','Asia/Baghdad','IQD') returning id`)).rows[0].id);
    const other=Number((await tx.execute(sql`insert into accounting_companies(name,country_code,timezone,base_currency)
      values('Empty rollback company','IQ','Asia/Baghdad','IQD') returning id`)).rows[0].id);
    await tx.execute(sql`insert into accounting_fiscal_years(company_id,name,starts_on,ends_on)
      values(${company},'2026','2026-01-01','2026-12-31')`);
    const ids:Record<string,number>={};
    for(const key of ["BANK","CASH","CHEQUES_ON_HAND","CHEQUE_CLEARING","ACCOUNTS_RECEIVABLE","WALLET_LIABILITY","SALES_REVENUE","FX_GAIN","FX_LOSS"]){
      const a=iraqChart.find(a=>a.key===key)!;
      ids[key]=Number((await tx.execute(sql`insert into accounting_accounts(company_id,code,name_ar,name_en,type)
        values(${company},${a.code},${a.nameAr},${a.nameEn},${a.type}) returning id`)).rows[0].id);
      await tx.execute(sql`insert into accounting_posting_rules(company_id,key,account_id) values(${company},${key},${ids[key]})`);
    }
    // Enabled only inside this rollback transaction, never a persisted cutover.
    await tx.execute(sql`insert into accounting_wallet_cutovers(company_id,pipeline_ready,enabled_at,opening_reference,reviewed_by)
      values(${company},true,'2026-01-01','Rollback test opening',1)`);
    await tx.execute(sql`insert into accounting_receipt_cutovers(company_id,processing_ready) values(${company},true)`);
    const customer=1800000000+randomInt(1,1000000);
    const customerCodes=new Map<number,string|null>();
    for(const [offset,currency] of [[0,"IQD"],[1,"USD"],[2,"IQD"],[3,"IQD"]] as const){
      const c=(await tx.execute(sql`insert into crm_customers(id,email,first_name,last_name)
        values(${customer+offset},${randomUUID()+"@example.invalid"},'گزارش','آزمایشی') returning customer_code`)).rows[0];
      customerCodes.set(customer+offset,c.customer_code===null?null:String(c.customer_code));
      await tx.execute(sql`insert into customer_wallets(id,customer_id,balance,currency)
        values(${customer+offset},${customer+offset},0,${currency})`);
      await tx.execute(sql`insert into accounting_wallet_links(wallet_id,company_id,customer_id,currency)
        values(${customer+offset},${company},${customer+offset},${currency})`);
    }
    const actor={actorId:1,actorType:"admin" as const,canManage:true};
    await tx.execute(sql`insert into accounting_exchange_rates(company_id,currency,effective_on,rate,source,reference)
      values(${company},'USD','2026-01-01','3','central_bank','Rollback official rate')`);
    const issue=async(source:string,cid:number,amount:string,due:string,currency="IQD",date="2026-01-01")=>{
      const {entry}=await postJournalEntry({companyId:company,entryDate:date,sourceType:"SalesInvoice",sourceId:source,
        description:"Posted real report fixture",lines:[
          {accountId:ids.ACCOUNTS_RECEIVABLE,currency,debit:amount,partyType:"customer",partyId:cid},
          {accountId:ids.SALES_REVENUE,currency,credit:amount},
        ]},actor,tx);
      return registerInvoiceReceivable({companyId:company,customerId:cid,currency,invoiceJournalId:entry.id,
        invoiceReference:source,dueOn:due},actor,tx);
    };
    const receive=async(source:string,cid:number,date:string,amount:string,method:"BANK"|"CHEQUE",rid?:number,currency="IQD")=>
      recordCustomerReceipt({companyId:company,customerId:cid,currency,sourceId:source,entryDate:date,amount,method,
        chequeNumber:method==="CHEQUE"?source:undefined,allocations:rid?[{receivableId:rid,amount}]:[],
        reason:"Rollback actual customer receipt",evidenceReference:"Rollback staff attestation"},actor,tx);
    const cashInvoice=await issue("cash-invoice",customer,"100","2026-02-15");
    const cash=await receive("cash-payment",customer,"2026-02-10","40","BANK",Number(cashInvoice.id));
    await returnCustomerReceipt(Number(cash.receipt.id),{sourceId:"cash-return",entryDate:"2026-03-01",
      evidenceReference:"Rollback actual outgoing evidence",reason:"Confirmed actual receipt return"},actor,tx);
    const foreignInvoice=await issue("usd-invoice",customer+1,"100","2026-02-01","USD");
    const cheque=await receive("usd-cheque",customer+1,"2026-02-10","40","CHEQUE",Number(foreignInvoice.id),"USD");
    await transitionCheque(Number(cheque.receipt.id),"bounced",{sourceId:"usd-bounce",entryDate:"2026-03-02",
      evidenceReference:"Rollback cheque bounce document",reason:"Actual bounced cheque"},actor,tx);
    const walletInvoice=await issue("wallet-invoice",customer+2,"80","2026-04-01");
    await receive("wallet-funding",customer+2,"2026-02-01","20","BANK");
    await settleWalletReceivable({companyId:company,walletId:customer+2,receivableId:Number(walletInvoice.id),
      sourceId:"wallet-pay",entryDate:"2026-02-12",amount:"10",reason:"Rollback actual settlement"},actor,tx);
    const huge="10000000000000001";
    const opening=await postJournalEntry({companyId:company,entryDate:"2026-01-01",sourceType:"ManualAR",sourceId:"unknown-opening",
      description:'=Unclassified source, "فارسی"',lines:[
        {accountId:ids.ACCOUNTS_RECEIVABLE,currency:"IQD",debit:huge,partyType:"customer",partyId:customer+3},
        {accountId:ids.SALES_REVENUE,currency:"IQD",credit:huge},
      ]},actor,tx);
    const correction=await postJournalEntry({companyId:company,entryDate:"2026-02-05",sourceType:"ManualAR",sourceId:"unknown-credit",
      description:"Actual customer credit without invoice deadline",lines:[
        {accountId:ids.BANK,currency:"IQD",debit:"7"},
        {accountId:ids.ACCOUNTS_RECEIVABLE,currency:"IQD",credit:"7",partyType:"customer",partyId:customer+3},
      ]},actor,tx);
    await t.test("statement exact opening, full-scope movement, page running balance and empty periods",async()=>{
      const f={companyId:company,customerId:customer+3,from:"2026-02-01",to:"2026-02-28",page:1,pageSize:1};
      const r=await readCustomerReport("customer-statement",f,tx);
      assert.equal(r.rows.length,1);assert.equal(r.rows[0].entryId,String(correction.entry.id));
      assert.equal(r.rows[0].runningNative,"9999999999999994.00000000");
      assert.equal(r.balances[0].opening,huge+".00000000");assert.equal(r.balances[0].periodCredit,"7.00000000");
      assert.equal(r.customer?.code,customerCodes.get(customer+3));
      const empty=await readCustomerReport("customer-statement",{...f,from:"2026-04-01",to:"2026-04-30"},tx);
      assert.deepEqual(empty.rows,[]);assert.equal(empty.balances[0].opening,"9999999999999994.00000000");
      const page2=await readCustomerReport("customer-statement",{...f,from:"2026-01-01",page:2},tx);
      assert.equal(page2.rows[0].runningBase,"9999999999999994.00000000");
      assert.equal(page2.pagination.totalRows,2);assert.equal(r.coverage.legacyOpeningVerified,false);
    });
    await t.test("receipt return is included at its posted date, not from current allocation status",async()=>{
      const f={companyId:company,customerId:customer,asOf:"2026-02-28"};
      const before=await readCustomerReport("receivables-aging",f,tx);
      assert.equal(before.rows[0].outstanding,"60.00000000");assert.equal(before.rows[0].bucket,"1-30");
      const after=await readCustomerReport("receivables-aging",{...f,asOf:"2026-03-01"},tx);
      assert.equal(after.rows[0].outstanding,"100.00000000");
      assert.equal(after.agingSummaries[0].ledgerClosing,"100.00000000");
      const statement=await readCustomerReport("customer-statement",{companyId:company,customerId:customer,from:"2026-02-01",to:"2026-03-01"},tx);
      assert.equal(statement.rows.length,2);assert.equal(statement.balances[0].closing,"100.00000000");
    });
    await t.test("foreign cheque bounce restores native debt only on its posted bounce date",async()=>{
      const f={companyId:company,customerId:customer+1,asOf:"2026-03-01"};
      const before=await readCustomerReport("receivables-aging",f,tx);
      assert.equal(before.rows[0].outstanding,"60.00000000");assert.equal(before.rows[0].currency,"USD");
      const after=await readCustomerReport("receivables-aging",{...f,asOf:"2026-03-02"},tx);
      assert.equal(after.rows[0].outstanding,"100.00000000");
      const statement=await readCustomerReport("customer-statement",{companyId:company,customerId:customer+1,from:"2026-01-01",to:"2026-03-02"},tx);
      assert.equal(statement.balances[0].closingBase,"300.00000000");
    });
    await t.test("wallet settlement reconstructs the invoice remaining amount as of its journal date",async()=>{
      const f={companyId:company,customerId:customer+2,asOf:"2026-02-11"};
      assert.equal((await readCustomerReport("receivables-aging",f,tx)).rows[0].outstanding,"80.00000000");
      assert.equal((await readCustomerReport("receivables-aging",{...f,asOf:"2026-02-12"},tx)).rows[0].outstanding,"70.00000000");
    });
    await t.test("unknown due debts and credits are explicit and never cancel across customers",async()=>{
      await postJournalEntry({companyId:company,entryDate:"2026-03-10",sourceType:"ManualAR",sourceId:"unapplied-customer-credit",
        description:"Unapplied real customer credit",lines:[
          {accountId:ids.BANK,currency:"IQD",debit:"5"},
          {accountId:ids.ACCOUNTS_RECEIVABLE,currency:"IQD",credit:"5",partyType:"customer",partyId:customer+2},
        ]},actor,tx);
      const r=await readCustomerReport("receivables-aging",{companyId:company,asOf:"2026-03-31"},tx);
      const unknown=r.rows.find(row=>row.customerId===String(customer+3))!;
      assert.equal(unknown.bucket,"unknown");assert.equal(unknown.dueOn,null);
      assert.equal(unknown.outstanding,"9999999999999994.00000000");
      const credit=r.rows.find(row=>row.customerId===String(customer+2)&&row.kind==="unclassified")!;
      assert.equal(credit.bucket,"credit");assert.equal(credit.outstanding,"-5.00000000");
      const native=r.agingSummaries.find(row=>row.currency==="IQD")!;
      assert.equal(native.unclassifiedDebit,"9999999999999994.00000000");assert.equal(native.unclassifiedCredit,"5.00000000");
      assert.ok(new Money(native.trackedOutstanding).plus(native.unclassifiedDebit).minus(native.unclassifiedCredit).eq(native.ledgerClosing));
      assert.equal(r.agingSummaries.length,2);
    });
    await t.test("aging bucket boundaries use the stored due date and the selected as-of date",async()=>{
      for(const [source,due] of [["current","2026-04-02"],["1-30","2026-03-03"],["31-60","2026-03-02"],["61-90","2026-01-02"],["over-90","2026-01-01"]])
        await issue("boundary-"+source,customer,"10",due);
      const r=await readCustomerReport("receivables-aging",{companyId:company,customerId:customer,asOf:"2026-04-02"},tx);
      for(const row of r.rows.filter(row=>row.invoiceReference?.startsWith("boundary-")))
        assert.equal(row.bucket,row.invoiceReference!.slice(9));
      assert.equal(r.rows.filter(row=>row.invoiceReference?.startsWith("boundary-")).length,5);
    });
    await t.test("unfunded invoice reversal removes aging at the reversal date but keeps original statement",async()=>{
      const invoice=await issue("void-invoice",customer,"12","2026-05-01", "IQD","2026-04-01");
      await reverseJournalEntry(Number(invoice.invoice_journal_id),"2026-04-03","Actual invoice correction",actor,tx);
      const before=await readCustomerReport("receivables-aging",{companyId:company,customerId:customer,asOf:"2026-04-02"},tx);
      assert.ok(before.rows.some(row=>row.invoiceReference==="void-invoice"));
      const after=await readCustomerReport("receivables-aging",{companyId:company,customerId:customer,asOf:"2026-04-03"},tx);
      assert.ok(!after.rows.some(row=>row.invoiceReference==="void-invoice"));
    });
    await t.test("currency/company filters, full CSV export and invalid combinations are enforced",async()=>{
      const f={companyId:company,asOf:"2026-04-02",currency:"USD",page:5,pageSize:1};
      const all=await readCustomerReport("receivables-aging",f,tx,true);
      assert.ok(all.rows.every(row=>row.currency==="USD"));assert.equal(all.pagination.page,1);
      assert.ok(customerReportCsv(all).includes('"baseCurrency","IQD"'));
      const full=await readCustomerReport("customer-statement",{companyId:company,customerId:customer+3,from:"2026-01-01",to:"2026-12-31",pageSize:1},tx,true);
      assert.equal(full.rows.length,2);assert.ok(customerReportCsv(full).includes("\"'=Unclassified"));
      const empty=await readCustomerReport("receivables-aging",{companyId:other,asOf:"2026-04-02"},tx);
      assert.deepEqual(empty.rows,[]);assert.equal(empty.coverage.receivableAccountCount,0);
      await assert.rejects(()=>readCustomerReport("customer-statement",{companyId:company,from:"2026-01-01",to:"2026-02-01"},tx));
      await assert.rejects(()=>readCustomerReport("receivables-aging",{companyId:company,asOf:"2026-01-01",from:"2026-01-01"},tx));
      await assert.rejects(()=>readCustomerReport("receivables-aging",{companyId:company,asOf:"2026-01-01",currency:"ZZZ"},tx));
      assert.ok(opening.entry.id);
    });
    await t.test("receipt workbench has real scoped list/detail/allocations, paged invoices and evidence history",async()=>{
      const f={companyId:company,pageSize:1};
      const list=await readReceiptList(f,tx);
      assert.equal(list.items.length,1);assert.equal(list.pagination.totalRows,3);
      assert.equal(list.metadata.processingReady,true);
      assert.equal(list.metadata.ledgerGuardsReady,true);
      assert.equal(list.summaries.length,3);
      assert.equal(list.summaries.find(s=>s.currency==="USD")?.status,"bounced");
      const all=await readReceiptList({...f,page:10},tx,true);
      assert.equal(all.items.length,3);assert.equal(all.pagination.page,1);
      assert.ok(receiptListCsv(all).includes("Received cheques are provisional"));
      const filter=await readReceiptList({companyId:company,method:"CHEQUE",currency:"USD",status:"bounced",
        from:"2026-02-01",to:"2026-02-28"},tx);
      assert.equal(filter.items.length,1);assert.equal(filter.items[0].id,cheque.receipt.id);
      assert.equal(filter.items[0].chequeNumber,"usd-cheque");assert.equal(filter.items[0].amount,"40.00000000");
      const detail=await readReceiptDetail(cash.receipt.id,company,tx);
      assert.equal(detail.allocations.length,1);assert.equal(detail.allocations[0].receivableId,cashInvoice.id);
      assert.equal(detail.allocations[0].openAmount,"100.00000000");
      assert.deepEqual(detail.events.map(e=>e.action),["received","returned"]);
      assert.equal(detail.events[0].entryDate,"2026-02-10");assert.equal(detail.events[1].entryDate,"2026-03-01");
      assert.ok(detail.events.every(e=>e.journalStatus==="posted"&&e.journalId>0&&e.evidenceReference.length>=5));
      assert.equal(detail.receipt.evidenceReference,"Rollback staff attestation");
      await assert.rejects(()=>readReceiptDetail(cash.receipt.id,other,tx),{code:"NOT_FOUND"});
      const choices=await readReceiptCustomers({companyId:company,q:String(customer+1)},tx);
      assert.equal(choices.items.length,1);assert.equal(choices.items[0].id,customer+1);
      assert.equal((await readReceiptCustomers({companyId:other,q:String(customer)},tx)).items.length,0);
      const invoices=await readReceiptOpenItems({companyId:company,customerId:customer,currency:"IQD"},tx);
      assert.ok(invoices.items.some(r=>r.id===cashInvoice.id));
      assert.ok(!invoices.items.some(r=>r.invoiceReference==="void-invoice"));
      assert.ok(invoices.items.every(r=>r.customerId===customer&&r.currency==="IQD"));
      assert.equal((await readReceiptOpenItems({companyId:company,customerId:customer,currency:"USD"},tx)).items.length,0);
      assert.equal((await readReceiptOpenItems({companyId:company,customerId:customer,currency:"IQD",page:2},tx)).items.length,0);
      const voided=(await tx.execute(sql`select id from accounting_receivable_items
        where company_id=${company} and invoice_reference='void-invoice'`)).rows[0];
      await assert.rejects(()=>recordCustomerReceipt({companyId:company,customerId:customer,currency:"IQD",
        sourceId:"must-not-pay-voided-invoice",entryDate:"2026-04-04",amount:"12",method:"BANK",
        evidenceReference:"Actual evidence",reason:"Stale invoice selection",
        allocations:[{receivableId:Number(voided.id),amount:"12"}]},actor,tx),{code:"POSTED_INVOICE_REQUIRED"});
      const disabled=await readReceiptList({companyId:other},tx);
      assert.equal(disabled.metadata.processingReady,false);assert.equal(disabled.metadata.walletCutoverReady,false);
      assert.equal(disabled.metadata.receiptCutoverReady,false);assert.equal(disabled.pagination.totalRows,0);
      await tx.execute(sql`update accounting_receipt_cutovers set processing_ready=false where company_id=${company}`);
      assert.equal((await readReceiptDetail(cash.receipt.id,company,tx)).metadata.processingReady,false);
      await assert.rejects(()=>recordCustomerReceipt({companyId:company,customerId:customer,currency:"IQD",
        sourceId:"must-not-save-blocked",entryDate:"2026-04-02",amount:"1",method:"BANK",
        evidenceReference:"Actual evidence",reason:"Blocked guard test",allocations:[]},actor,tx),
        {code:"RECEIPT_CUTOVER_BLOCKED"});
      await assert.rejects(()=>transitionCheque(Number(cheque.receipt.id),"deposited",{sourceId:"must-not-transition",
        entryDate:"2026-04-02",evidenceReference:"Actual evidence",reason:"Blocked guard test"},actor,tx),
        {code:"RECEIPT_CUTOVER_BLOCKED"});
      await assert.rejects(()=>returnCustomerReceipt(Number(cash.receipt.id),{sourceId:"must-not-return",
        entryDate:"2026-04-02",evidenceReference:"Actual evidence",reason:"Blocked guard test"},actor,tx),
        {code:"RECEIPT_CUTOVER_BLOCKED"});
      await assert.rejects(()=>recordCustomerReceipt({companyId:company,customerId:customer,currency:"IQD",
        sourceId:"viewer-must-not-save",entryDate:"2026-04-02",amount:"1",method:"BANK",
        evidenceReference:"Actual evidence",reason:"Viewer guard test",allocations:[]},{...actor,canManage:false},tx),
        {code:"ACCESS_DENIED"});
      assert.equal((await readReceiptList({companyId:company},tx)).pagination.totalRows,3);
    });
    complete=true;throw rollback;
  });}catch(e){if(e!==rollback)throw e;}finally{await pool.end();}
  assert.ok(complete);
});