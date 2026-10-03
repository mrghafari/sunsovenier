import test from "node:test";
import assert from "node:assert/strict";
import {randomInt,randomUUID} from "node:crypto";
import {sql} from "drizzle-orm";
import {accountingDb} from "./db";
import {pool} from "../../db";
import {iraqChart} from "./iraq-chart";
import {recordCustomerReceipt,registerInvoiceReceivable,returnCustomerReceipt,transitionCheque} from "./receipts";
import {postJournalEntry,reverseJournalEntry} from "./postJournalEntry";
import {settleWalletReceivable} from "./wallet-settlement";

test("bank/cash receipt returns are atomic and preserve carrying values",{skip:process.env.ACCOUNTING_DB_TEST!=="1"},async t=>{
  const rollback=new Error("ROLLBACK_RECEIPT_RETURNS");let completed=false;
  try{await accountingDb.transaction(async tx=>{
    await tx.execute(sql`select pg_advisory_xact_lock(718392,0)`);
    const company=Number((await tx.execute(sql`insert into accounting_companies(name,country_code,timezone,base_currency)
      values('Rollback receipt returns','IQ','Asia/Baghdad','IQD') returning id`)).rows[0].id);
    await tx.execute(sql`insert into accounting_fiscal_years(company_id,name,starts_on,ends_on)
      values(${company},'2026','2026-01-01','2026-12-31')`);
    const ids:Record<string,number>={};
    for(const key of ["BANK","CASH","CHEQUES_ON_HAND","CHEQUE_CLEARING","ACCOUNTS_RECEIVABLE","WALLET_LIABILITY","SALES_REVENUE","FX_GAIN","FX_LOSS"]){
      const c=iraqChart.find(a=>a.key===key)!;
      ids[key]=Number((await tx.execute(sql`insert into accounting_accounts(company_id,code,name_ar,name_en,type)
        values(${company},${c.code},${c.nameAr},${c.nameEn},${c.type}) returning id`)).rows[0].id);
      await tx.execute(sql`insert into accounting_posting_rules(company_id,key,account_id) values(${company},${key},${ids[key]})`);
    }
    await tx.execute(sql`insert into accounting_wallet_cutovers(company_id,pipeline_ready,enabled_at,opening_reference,reviewed_by)
      values(${company},true,'2026-01-01','Rollback-only zero opening',1)`);
    await tx.execute(sql`insert into accounting_receipt_cutovers(company_id,processing_ready) values(${company},true)`);
    const customer=1800000000+randomInt(1,1000000);
    const actor={actorId:1,actorType:"admin" as const,canManage:true};
    for(const [offset,currency] of [[0,"IQD"],[1,"USD"]] as const){
      await tx.execute(sql`insert into crm_customers(id,email,first_name,last_name)
        values(${customer+offset},${randomUUID()+"@example.invalid"},'Return','Rollback')`);
      await tx.execute(sql`insert into customer_wallets(id,customer_id,balance,currency)
        values(${customer+offset},${customer+offset},0,${currency})`);
      await tx.execute(sql`insert into accounting_wallet_links(wallet_id,company_id,customer_id,currency)
        values(${customer+offset},${company},${customer+offset},${currency})`);
    }
    const rate=async(date:string,value:string)=>tx.execute(sql`insert into accounting_exchange_rates(company_id,currency,effective_on,rate,source,reference)
      values(${company},'USD',${date},${value},'central_bank','Rollback official rate')`);
    const issue=async(source:string,date:string,amount:string,currency="USD")=>{
      const cid=customer+(currency==="USD"?1:0);
      const {entry}=await postJournalEntry({companyId:company,entryDate:date,sourceType:"SalesInvoice",sourceId:source,
        description:"Rollback invoice for actual receipt return",lines:[
          {accountId:ids.ACCOUNTS_RECEIVABLE,currency,debit:amount,partyType:"customer",partyId:cid},
          {accountId:ids.SALES_REVENUE,currency,credit:amount},
        ]},actor,tx);
      return registerInvoiceReceivable({companyId:company,customerId:cid,currency,invoiceJournalId:entry.id,
        invoiceReference:source,dueOn:"2026-12-01"},actor,tx);
    };
    const receive=async(source:string,date:string,amount:string,method:"BANK"|"CASH"|"CHEQUE",
      allocations:{receivableId:number;amount:string}[]=[],currency="USD")=>recordCustomerReceipt({
        companyId:company,customerId:customer+(currency==="USD"?1:0),currency,sourceId:source,entryDate:date,amount,method,
        chequeNumber:method==="CHEQUE"?source:undefined,allocations,
        reason:"Rollback staff-attested actual receipt",evidenceReference:"Rollback original bank/cash evidence"},actor,tx);
    const evidence=(source:string,date:string)=>({sourceId:source,entryDate:date,
      evidenceReference:"Rollback actual outgoing bank/cash document",reason:"Confirmed bank/cash receipt fully returned"});
    const ret=(rid:number,source:string,date:string)=>returnCustomerReceipt(rid,evidence(source,date),actor,tx);
    const rejects=async(fn:()=>Promise<unknown>)=>{
      await tx.execute(sql`savepoint rejected_return`);let error:unknown;
      try{await fn();}catch(e){error=e;}
      await tx.execute(sql`rollback to savepoint rejected_return`);await tx.execute(sql`release savepoint rejected_return`);
      assert.ok(error,"Operation must reject");return error;
    };
    const isolate=async(name:string,fn:()=>Promise<void>)=>t.test(name,async()=>{
      await tx.execute(sql`savepoint return_case`);
      try{await fn();}finally{await tx.execute(sql`rollback to savepoint return_case`);await tx.execute(sql`release savepoint return_case`);}
    });
    await isolate("foreign return reopens multiple invoice-specific allocations and closes exact asset/wallet residuals",async()=>{
      await rate("2026-06-01","2");const a=await issue("return-a","2026-06-01","20");
      await rate("2026-06-02","4");const b=await issue("return-b","2026-06-02","10");
      await rate("2026-06-03","3");
      const r=await receive("return-original","2026-06-03","40","BANK",[
        {receivableId:Number(a.id),amount:"20"},{receivableId:Number(b.id),amount:"10"}]);
      await rate("2026-06-04","9");
      const result=await ret(Number(r.receipt.id),"return-confirmed","2026-06-04");
      assert.ok("bookValues" in result);
      if("bookValues" in result){
        assert.equal(result.bookValues.assetBaseTransferred,"120.00000000");
        assert.equal(result.bookValues.receivableBaseRestored,"80.00000000");
        assert.equal(result.bookValues.walletBaseRecovered,"30.00000000");
      }
      assert.equal(result.recoveredWalletAmount,"10.00000000");
      assert.equal((await ret(Number(r.receipt.id),"return-confirmed","2026-06-04")).duplicate,true);
      await rejects(()=>ret(Number(r.receipt.id),"changed-return","2026-06-04"));
      const settled=(await tx.execute(sql`select settled_amount::text as n from accounting_receivable_items where id in (${a.id},${b.id})`)).rows;
      assert.ok(settled.every(x=>x.n==="0.00000000"));
      const assets=(await tx.execute(sql`select sum(l.debit-l.credit)::text as n,sum(l.base_debit-l.base_credit)::text as b
        from accounting_journal_lines l join accounting_journal_entries e on e.id=l.entry_id and e.status='posted'
        where e.company_id=${company} and l.account_id=${ids.BANK} and l.currency='USD'`)).rows[0];
      assert.equal(assets.n,"0.00000000");assert.equal(assets.b,"0.00000000");
      await rejects(()=>reverseJournalEntry(Number(r.journalId),"2026-06-04","Independent return reversal is unsafe",actor,tx));
      await rejects(()=>reverseJournalEntry(Number(result.journalId),"2026-06-04","Independent return reversal is unsafe",actor,tx));
      await tx.execute(sql`set constraints all immediate`);
    });
    await isolate("cash return consumes pooled asset/wallet values and makes spent excess a settleable debt",async()=>{
      await rate("2026-06-01","2");const claim=await issue("spent-return-invoice","2026-06-01","6");
      const r=await receive("spent-return-source","2026-06-01","10","CASH");
      await settleWalletReceivable({companyId:company,walletId:customer+1,receivableId:Number(claim.id),
        amount:"6",sourceId:"spent-return-excess",entryDate:"2026-06-01",reason:"Spend actual prepaid funds"},actor,tx);
      await rate("2026-06-02","4");await receive("pooled-cash","2026-06-02","10","CASH");
      const result=await ret(Number(r.receipt.id),"pooled-cash-return","2026-06-02");
      assert.equal(result.recoveredWalletAmount,"10.00000000");assert.equal(result.newReceivable,"0.00000000");
      assert.ok("bookValues" in result);
      if("bookValues" in result){
        assert.equal(result.bookValues.assetBaseTransferred,"30.00000000");
        assert.equal(result.bookValues.walletBaseRecovered,"34.00000000");
      }
      // Returning the remaining receipt uses the full residual; the six spent units become a debt.
      const second=(await tx.execute(sql`select id from accounting_customer_receipts where company_id=${company} and source_id='pooled-cash'`)).rows[0];
      const debtReturn=await ret(Number(second.id),"last-cash-return","2026-06-02");
      assert.equal(debtReturn.recoveredWalletAmount,"4.00000000");assert.equal(debtReturn.newReceivable,"6.00000000");
      assert.ok("bookValues" in debtReturn);
      if("bookValues" in debtReturn){
        assert.equal(debtReturn.bookValues.assetBaseTransferred,"30.00000000");
        assert.equal(debtReturn.bookValues.walletBaseRecovered,"14.00000000");
        assert.equal(debtReturn.bookValues.newReceivableBase,"24.00000000");
      }
      const debt=(await tx.execute(sql`select id from accounting_receivable_items where invoice_journal_id=${debtReturn.journalId}`)).rows[0];
      await receive("return-debt-payment","2026-06-02","6","BANK");
      const closed=await settleWalletReceivable({companyId:company,walletId:customer+1,receivableId:Number(debt.id),
        amount:"6",sourceId:"return-debt-wallet-close",entryDate:"2026-06-02",reason:"Close original returned receipt debt"},actor,tx);
      assert.equal("receivableBaseSettled" in closed&&closed.receivableBaseSettled,"24.00000000");
      await tx.execute(sql`set constraints all immediate`);
    });
    await isolate("base-currency returns retain the original invoice and never produce a negative wallet",async()=>{
      const claim=await issue("base-return-invoice","2026-06-01","30","IQD");
      const r=await receive("base-return-source","2026-06-01","50","BANK",[{receivableId:Number(claim.id),amount:"30"}],"IQD");
      const spent=await issue("base-return-spent","2026-06-01","20","IQD");
      await settleWalletReceivable({companyId:company,walletId:customer,receivableId:Number(spent.id),amount:"20",
        sourceId:"base-excess-spent",entryDate:"2026-06-01",reason:"Spend actual base prepaid funds"},actor,tx);
      const result=await ret(Number(r.receipt.id),"base-return-confirmed","2026-06-02");
      assert.equal(result.recoveredWalletAmount,"0.00000000");assert.equal(result.newReceivable,"20.00000000");
      assert.equal((await tx.execute(sql`select balance::text as n from customer_wallets where id=${customer}`)).rows[0].n,"0.00");
      assert.equal((await tx.execute(sql`select settled_amount::text as n from accounting_receivable_items where id=${claim.id}`)).rows[0].n,"0.00000000");
      await tx.execute(sql`set constraints all immediate`);
    });
    await isolate("asset insufficiency, later postings and legacy reservations cannot be bypassed",async()=>{
      await rate("2026-06-01","2");const r=await receive("return-insufficient-asset","2026-06-01","10","BANK");
      await postJournalEntry({companyId:company,entryDate:"2026-06-02",sourceType:"AssetTransfer",
        sourceId:"return-asset-used",description:"Actual transfer leaves too little bank cash",lines:[
          {accountId:ids.CASH,currency:"USD",debit:"6"},{accountId:ids.BANK,currency:"USD",credit:"6"}]},actor,tx);
      await rejects(()=>ret(Number(r.receipt.id),"overdraw-return","2026-06-02"));
      await receive("restore-bank-asset","2026-06-02","6","BANK");
      await rejects(()=>ret(Number(r.receipt.id),"older-asset-return","2026-06-01"));
      await tx.execute(sql`update customer_wallets set reserved_balance=12 where id=${customer+1}`);
      const result=await ret(Number(r.receipt.id),"respect-legacy-reserves","2026-06-02");
      assert.equal(result.recoveredWalletAmount,"4.00000000");assert.equal(result.newReceivable,"6.00000000");
      assert.equal((await tx.execute(sql`select balance::text as n from customer_wallets where id=${customer+1}`)).rows[0].n,"12.00");
      await tx.execute(sql`set constraints all immediate`);
    });
    await isolate("other uncleared funds are preserved; backdates, viewers, cheques and invalid inputs reject",async()=>{
      await rate("2026-06-01","2");
      const r=await receive("return-with-blocked-source","2026-06-01","10","BANK");
      await receive("other-uncleared","2026-06-01","5","CHEQUE");
      const spend=await issue("return-spend-before-bounce","2026-06-01","10");
      await settleWalletReceivable({companyId:company,walletId:customer+1,receivableId:Number(spend.id),
        amount:"10",sourceId:"use-free-funds",entryDate:"2026-06-01",reason:"Only free funds, not the other cheque"},actor,tx);
      const result=await ret(Number(r.receipt.id),"return-with-blocked","2026-06-02");
      assert.equal(result.recoveredWalletAmount,"0.00000000");assert.equal(result.newReceivable,"10.00000000");
      assert.equal((await tx.execute(sql`select balance::text as n from customer_wallets where id=${customer+1}`)).rows[0].n,"5.00");
      const another=await receive("guard-source","2026-06-02","1","CASH");
      await rejects(()=>ret(Number(another.receipt.id),"backdated-return","2026-06-01"));
      await rejects(()=>returnCustomerReceipt(Number(another.receipt.id),evidence("viewer-return","2026-06-02"),{...actor,canManage:false},tx));
      await rejects(()=>returnCustomerReceipt(Number(another.receipt.id),{...evidence("partial-return","2026-06-02"),amount:"0.5"} as never,actor,tx));
      const cheque=(await tx.execute(sql`select id from accounting_customer_receipts where company_id=${company} and method='CHEQUE'`)).rows[0];
      await rejects(()=>ret(Number(cheque.id),"wrong-receipt-type","2026-06-02"));
      await rejects(()=>transitionCheque(Number(r.receipt.id),"bounced",evidence("wrong-cheque-api","2026-06-02"),actor,tx));
      await tx.execute(sql`set constraints all immediate`);
    });
    await isolate("direct changes, orphan proofs, fabricated returns and immutable proof tampering fail closed",async()=>{
      await rate("2026-06-01","2");const r=await receive("proof-guard-source","2026-06-01","1","BANK");
      await rejects(async()=>{
        await tx.execute(sql`update accounting_customer_receipts set status='returned' where id=${r.receipt.id}`);
        await tx.execute(sql`set constraints accounting_receipt_return_complete immediate`);
      });
      await rejects(async()=>{
        await tx.execute(sql`insert into accounting_cheque_book_values(receipt_id,action,entry_date,input)
          values(${r.receipt.id},'returned','2026-06-01',${JSON.stringify(evidence("orphan-return","2026-06-01"))}::jsonb)`);
        await tx.execute(sql`set constraints accounting_cheque_book_used immediate`);
      });
      await rejects(()=>postJournalEntry({companyId:company,entryDate:"2026-06-01",sourceType:"ReceiptReturned",
        sourceId:"unproven-return",description:"Cannot invent a return",lines:[
          {accountId:ids.WALLET_LIABILITY,currency:"USD",debit:"1",partyType:"customer",partyId:customer+1},
          {accountId:ids.BANK,currency:"USD",credit:"1"}]},actor,tx));
      const result=await ret(Number(r.receipt.id),"proof-guard-return","2026-06-01");
      await rejects(()=>tx.execute(sql`update accounting_cheque_book_values set asset_base=999 where receipt_id=${r.receipt.id}`));
      await rejects(()=>tx.execute(sql`delete from accounting_cheque_book_values where receipt_id=${r.receipt.id}`));
      assert.ok(result.journalId);
      await tx.execute(sql`set constraints all immediate`);
    });
    await isolate("zero-base foreign minor units close without inventing base money",async()=>{
      await rate("2026-06-01","1");const r=await receive("zero-return-source","2026-06-01","0.01","CASH");
      const result=await ret(Number(r.receipt.id),"zero-return-confirmed","2026-06-01");
      assert.ok("bookValues" in result);
      if("bookValues" in result){
        assert.equal(result.bookValues.assetBaseTransferred,"0.00000000");assert.equal(result.bookValues.walletBaseRecovered,"0.00000000");
      }
      await tx.execute(sql`set constraints all immediate`);
    });
    completed=true;throw rollback;
  });}catch(e){if(e!==rollback)throw e;}finally{await pool.end();}
  assert.ok(completed);
});