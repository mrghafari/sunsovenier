import {test,after} from "node:test";
import assert from "node:assert/strict";
import {randomInt,randomUUID} from "node:crypto";
import {sql} from "drizzle-orm";
import {pool} from "../../db";
import {accountingDb,type AccountingTransaction} from "./db";
import {linkWallet,recordWalletMovement} from "./wallet";
import {readWalletRefundPlan,recordDocumentedWalletRefund,readDocumentedWalletRefunds} from "./wallet-refunds";
import {postJournalEntry,reverseJournalEntry} from "./postJournalEntry";
after(()=>pool.end());
test("documented payouts use historical pools and atomic native/GL evidence (rollback-only)",
 {skip:process.env.ACCOUNTING_DB_TEST!=="1"},async t=>{
  const sentinel=new Error("ROLLBACK_DOCUMENTED_PAYOUT_FIXTURES");
  let completed=false;
  try{await accountingDb.transaction(async tx=>{
    await tx.execute(sql`select pg_advisory_xact_lock(718392,0)`);
    const role=(await tx.execute(sql`select id from admin_roles where is_active and
      lower(regexp_replace(btrim(name),'[[:space:]-]+','_','g')) in ('super_admin','supper_admin','admin') limit 1`)).rows[0];
    assert.ok(role);
    const actorId=Number((await tx.execute(sql`insert into users(username,email,password_hash,role_id)
      values(${"payout-fixture-"+randomUUID()},${randomUUID()+"@example.invalid"},'fixture-password-hash',${role.id}) returning id`)).rows[0].id);
    const actor={actorId,actorType:"admin" as const,canManage:true};
    const check=(name:string,run:()=>Promise<void>)=>t.test(name,
      {skip:process.env.ACCOUNTING_REFUND_ZERO_ONLY==="1"&&!name.includes("minor unit")},run);
    async function fixture(rate:string,currency:"USD"|"IQD"="USD"){
      const companyId=Number((await tx.execute(sql`insert into accounting_companies(name,country_code,timezone,base_currency)
        values(${"Payout rollback "+randomUUID()},'IQ','Asia/Baghdad','IQD') returning id`)).rows[0].id);
      await tx.execute(sql`insert into accounting_fiscal_years(company_id,name,starts_on,ends_on) values(${companyId},'2026','2026-01-01','2026-12-31')`);
      const accounts=new Map<string,number>();
      for(const [i,key] of ["BANK","GATEWAY","CASH","WALLET_LIABILITY","FX_GAIN","FX_LOSS"].entries()){
        const type=key==="WALLET_LIABILITY"?"liability":key==="FX_GAIN"?"revenue":key==="FX_LOSS"?"expense":"asset";
        const aid=Number((await tx.execute(sql`insert into accounting_accounts(company_id,code,name_en,name_ar,type)
          values(${companyId},${`PF${i}`},${key},${key},${type}) returning id`)).rows[0].id);
        accounts.set(key,aid);
        await tx.execute(sql`insert into accounting_posting_rules(company_id,key,account_id) values(${companyId},${key},${aid})`);
      }
      await tx.execute(sql`insert into accounting_wallet_cutovers(company_id,pipeline_ready,enabled_at,opening_reference,reviewed_by)
        values(${companyId},true,'2026-01-01','Rollback reviewed wallet opening',${actorId})`);
      await tx.execute(sql`insert into accounting_receipt_cutovers(company_id,processing_ready) values(${companyId},true)`);
      await tx.execute(sql`insert into accounting_wallet_refund_cutovers(company_id) values(${companyId})`);
      if(currency==="USD")await tx.execute(sql`insert into accounting_exchange_rates(company_id,currency,effective_on,rate,source,reference)
        values(${companyId},'USD','2026-06-01',${rate},'central_bank','Rollback-only rate evidence')`);
      async function customer(){
        const wid=1800000000+randomInt(1,1000000);
        await tx.execute(sql`insert into crm_customers(id,email,first_name,last_name) values(${wid},${randomUUID()+"@example.invalid"},'Payout','Fixture')`);
        await tx.execute(sql`insert into customer_wallets(id,customer_id,balance,currency,credit_limit) values(${wid},${wid},0,${currency},0)`);
        await linkWallet(companyId,wid,actor,tx);return wid;
      }
      const walletId=await customer();
      return {companyId,walletId,customer,accounts};
    }
    async function rejected(operation:(inner:AccountingTransaction)=>Promise<unknown>){
      const sp=sql.identifier("rejected_"+randomUUID().replaceAll("-",""));
      await tx.execute(sql`savepoint ${sp}`);
      try{await assert.rejects(()=>operation(tx));}finally{
        await tx.execute(sql`rollback to savepoint ${sp}`);await tx.execute(sql`release savepoint ${sp}`);
      }
    }
    const f=await fixture("1500");
    const topup=(walletId:number,amount:string,entryDate="2026-06-01")=>recordWalletMovement("topup",
      {companyId:f.companyId,walletId,sourceId:randomUUID(),entryDate,amount,channel:"BANK",
        evidenceReference:"Rollback bank deposit evidence",reason:"Rollback customer deposit"},actor,tx);
    await topup(f.walletId,"100");
    const second=await f.customer();
    await tx.execute(sql`insert into accounting_exchange_rates(company_id,currency,effective_on,rate,source,reference)
      values(${f.companyId},'USD','2026-06-02',1800,'central_bank','Rollback changed rate')`);
    await topup(second,"100","2026-06-02");
    const quote={companyId:f.companyId,walletId:f.walletId,amount:"20",entryDate:"2026-06-03",channel:"BANK" as const};
    const command=async(sourceId:string,amount="20",channel:"BANK"|"CASH"="BANK")=>{
      const plan=await readWalletRefundPlan({...quote,amount,channel},tx);
      return {...quote,amount,channel,sourceId,expectedPlanHash:plan.planHash,evidenceReference:"Rollback actual payout bank reference",
        payoutReference:`bank-${sourceId}`,reason:"Rollback customer requested payout",payoutDocumentConfirmed:true};
    };
    await check("closed independent payout gate still exposes honest historical valuation",async()=>{
      const p=await readWalletRefundPlan(quote,tx).catch(e=>{console.error("First payout valuation cause:",e.cause?.message??e.message);throw e;});
      assert.equal(p.financialGateOpen,false);assert.equal(p.postingAllowed,false);
      assert.equal(p.valuation.available,true);
      assert.equal(Number(p.valuation.liabilityBase),30000);assert.equal(Number(p.valuation.fundingBase),33000);
      assert.equal(Number(p.valuation.fxLoss),3000);
      const closed=await command("closed-payout");
      await rejected(inner=>recordDocumentedWalletRefund(closed,actor,inner));
    });
    await tx.execute(sql`update accounting_wallet_refund_cutovers set processing_ready=true,starts_on='2026-06-01',
      reviewed_by=${actorId},evidence_reference='Rollback reviewed actual payout opening' where company_id=${f.companyId}`);
    let result:{id:number;journalId:number;movementId:number;duplicate:boolean};
    const first=await command("first-documented-payout");
    await check("pooled bank carry differs from customer carry; exact realized loss and native debit commit",async()=>{
      result=await recordDocumentedWalletRefund(first,actor,tx);
      const w=(await tx.execute(sql`select balance from customer_wallets where id=${f.walletId}`)).rows[0];
      assert.equal(Number(w.balance),80);
      const fx=(await tx.execute(sql`select sum(base_debit-base_credit)::text amount from accounting_journal_lines
        where entry_id=${result.journalId} and account_id=${f.accounts.get("FX_LOSS")!}`)).rows[0];
      assert.equal(Number(fx.amount),3000);
      assert.equal((await recordDocumentedWalletRefund(first,actor,tx)).duplicate,true);
      await rejected(inner=>recordDocumentedWalletRefund({...first,reason:"Changed reason conflicts"},actor,inner));
      await rejected(inner=>recordDocumentedWalletRefund({...first,sourceId:"same-bank-reference-new-command"},actor,inner));
      const history=await readDocumentedWalletRefunds({companyId:f.companyId,walletId:f.walletId},tx);
      assert.equal(history.rows.length,1);assert.equal(history.rows[0].payoutReference,first.payoutReference.toUpperCase());
      await rejected(inner=>reverseJournalEntry(result.journalId,"2026-06-04","Uncoordinated payout reversal",actor,inner));
    });
    await check("permissions, fresh review, precision, reserved funds, asset pool and chronology are enforced",async()=>{
      await rejected(async inner=>recordDocumentedWalletRefund(await command("denied"),{...actor,canManage:false},inner));
      await rejected(inner=>recordDocumentedWalletRefund({...first,sourceId:"stale-review"},actor,inner));
      await rejected(inner=>readWalletRefundPlan({...quote,amount:"0.001"},inner));
      await rejected(inner=>recordDocumentedWalletRefund({...first,payoutDocumentConfirmed:false},actor,inner));
      await rejected(inner=>postJournalEntry({companyId:f.companyId,entryDate:quote.entryDate,
        sourceType:"WalletRefund",sourceId:"undocumented-trusted-payout",description:"Cannot bypass payout evidence",lines:[
          {accountId:f.accounts.get("WALLET_LIABILITY")!,currency:"USD",debit:"1",partyType:"customer",partyId:f.walletId},
          {accountId:f.accounts.get("BANK")!,currency:"USD",credit:"1"}]},actor,inner));
      await tx.execute(sql`update customer_wallets set reserved_balance=70 where id=${f.walletId}`);
      assert.equal((await readWalletRefundPlan(quote,tx)).valuation.blockingReason,"REFUND_AVAILABLE_FUNDS_EXCEEDED");
      await tx.execute(sql`update customer_wallets set reserved_balance=0 where id=${f.walletId}`);
      assert.equal((await readWalletRefundPlan({...quote,channel:"CASH"},tx)).valuation.available,false);
      assert.equal((await readWalletRefundPlan({...quote,entryDate:"2026-06-01"},tx)).valuation.blockingReason,"REFUND_CHRONOLOGY_INVALID");
    });
    await check("a higher-cost customer liability produces a mapped revenue FX gain, not a fictional rate",async()=>{
      const q={...quote,walletId:second};
      const p=await readWalletRefundPlan(q,tx);
      assert.equal(p.postingAllowed,true);assert.equal(Number(p.valuation.fxGain),3000);
      const posted=await recordDocumentedWalletRefund({...q,sourceId:"documented-gain-payout",expectedPlanHash:p.planHash,
        payoutReference:"bank-gain-reference",evidenceReference:"Rollback gain payout proof",reason:"Rollback actual customer payout",payoutDocumentConfirmed:true},actor,tx);
      const gain=(await tx.execute(sql`select sum(base_credit-base_debit)::text amount from accounting_journal_lines
        where entry_id=${posted.journalId} and account_id=${f.accounts.get("FX_GAIN")!}`)).rows[0];
      assert.equal(Number(gain.amount),3000);
    });
    await check("caught downstream failure rolls back its own proof, GL and native debit",async()=>{
      await tx.execute(sql.raw(`create function payout_fixture_fail() returns trigger language plpgsql as $$ begin
        if NEW.id=${f.walletId} and NEW.balance<OLD.balance then raise exception 'Downstream payout fixture failure'; end if; return NEW; end $$`));
      await tx.execute(sql`create trigger payout_fixture_fail before update on customer_wallets for each row execute function payout_fixture_fail()`);
      const bad=await command("failed-documented-payout");
      await assert.rejects(()=>recordDocumentedWalletRefund(bad,actor,tx));
      assert.equal(Number((await tx.execute(sql`select balance from customer_wallets where id=${f.walletId}`)).rows[0].balance),80);
      assert.equal(Number((await tx.execute(sql`select count(*) n from accounting_wallet_refund_books where source_id=${bad.sourceId}`)).rows[0].n),0);
      assert.equal(Number((await tx.execute(sql`select count(*) n from accounting_journal_entries where company_id=${f.companyId} and source_id=${bad.sourceId}`)).rows[0].n),0);
      await tx.execute(sql`drop trigger payout_fixture_fail on customer_wallets`);await tx.execute(sql`drop function payout_fixture_fail()`);
      await recordDocumentedWalletRefund(await command("after-caught-failure"),actor,tx);
    });
    await check("successive operations safely compose even after deferred guards were flushed",async()=>{
      await recordDocumentedWalletRefund(await command("successive-payout","10"),actor,tx);
      assert.equal(Number((await tx.execute(sql`select balance from customer_wallets where id=${f.walletId}`)).rows[0].balance),50);
      await rejected(inner=>inner.execute(sql`update accounting_wallet_refund_books set valuation='{}'::jsonb where id=${result!.id}`));
    });
    await check("cash payout consumes its own proven cash pool, not the bank pool",async()=>{
      const equity=Number((await tx.execute(sql`insert into accounting_accounts(company_id,code,name_en,name_ar,type)
        values(${f.companyId},'PFEquity','Fixture equity','Fixture equity','equity') returning id`)).rows[0].id);
      await postJournalEntry({companyId:f.companyId,entryDate:"2026-06-03",sourceType:"RollbackFunding",sourceId:randomUUID(),
        description:"Rollback-only cash fixture",lines:[
          {accountId:f.accounts.get("CASH")!,currency:"USD",debit:"100"},
          {accountId:equity,currency:"USD",credit:"100"}]},actor,tx);
      const p=await readWalletRefundPlan({...quote,channel:"CASH"},tx);
      assert.equal(p.postingAllowed,true);assert.equal(Number(p.valuation.fundingBase),36000);
      await recordDocumentedWalletRefund(await command("documented-cash-payout","20","CASH"),actor,tx);
    });
    await check("base-currency payout keeps native/base equal and company links cannot cross",async()=>{
      const b=await fixture("1","IQD");
      await recordWalletMovement("topup",{companyId:b.companyId,walletId:b.walletId,sourceId:randomUUID(),entryDate:"2026-06-01",
        amount:"100",channel:"BANK",evidenceReference:"Rollback dinar deposit",reason:"Rollback dinar deposit"},actor,tx);
      await tx.execute(sql`update accounting_wallet_refund_cutovers set processing_ready=true,starts_on='2026-06-01',
        reviewed_by=${actorId},evidence_reference='Rollback dinar payout opening' where company_id=${b.companyId}`);
      const q={companyId:b.companyId,walletId:b.walletId,amount:"25",entryDate:"2026-06-02",channel:"BANK" as const};
      const p=await readWalletRefundPlan(q,tx);
      assert.equal(p.postingAllowed,true);assert.equal(Number(p.valuation.liabilityBase),25);
      assert.equal(Number(p.valuation.fundingBase),25);assert.equal(Number(p.valuation.fxGain),0);assert.equal(Number(p.valuation.fxLoss),0);
      await recordDocumentedWalletRefund({...q,sourceId:"dinar-documented-payout",expectedPlanHash:p.planHash,
        payoutReference:"dinar-bank-reference",evidenceReference:"Rollback dinar payout proof",
        reason:"Rollback native dinar payout",payoutDocumentConfirmed:true},actor,tx);
      await rejected(inner=>readWalletRefundPlan({...q,companyId:f.companyId},inner));
    });
    await check("final foreign minor unit closes exact zero book residual without a generic zero journal",async()=>{
      const z=await fixture("20");
      await recordWalletMovement("topup",{companyId:z.companyId,walletId:z.walletId,sourceId:randomUUID(),entryDate:"2026-06-01",
        amount:"0.03",channel:"BANK",evidenceReference:"Rollback small deposit",reason:"Rollback small deposit"},actor,tx);
      await tx.execute(sql`update accounting_wallet_refund_cutovers set processing_ready=true,starts_on='2026-06-01',
        reviewed_by=${actorId},evidence_reference='Rollback zero residual proof' where company_id=${z.companyId}`);
      for(const [i,amount] of ["0.02","0.01"].entries()){
        const q={companyId:z.companyId,walletId:z.walletId,amount,entryDate:"2026-06-02",channel:"BANK" as const};
        const p=await readWalletRefundPlan(q,tx);assert.equal(p.postingAllowed,true);
        if(i===1){
          assert.equal(Number(p.valuation.liabilityBase),0);assert.equal(Number(p.valuation.fundingBase),0);
          assert.ok(p.valuation.lines.every(line=>Number(line.exchangeRate)>0));
          assert.ok(p.valuation.historicalRateEvidence?.liabilitySourceLineId);
          assert.ok(p.valuation.historicalRateEvidence?.fundingSourceLineId);
        }
        await recordDocumentedWalletRefund({...q,sourceId:`zero-minor-${i}`,expectedPlanHash:p.planHash,
          payoutReference:`tiny-bank-reference-${i}`,evidenceReference:"Rollback tiny payout proof",reason:"Rollback exact native closure",payoutDocumentConfirmed:true},actor,tx)
          .catch(e=>{console.error("Zero payout cause:",e.cause?.message??e.message);throw e;});
      }
      assert.equal(Number((await tx.execute(sql`select balance from customer_wallets where id=${z.walletId}`)).rows[0].balance),0);
      await rejected(inner=>postJournalEntry({companyId:z.companyId,entryDate:"2026-06-03",sourceType:"RollbackGenericZero",
        sourceId:randomUUID(),description:"Not a historical payout proof",lines:[
          {accountId:z.accounts.get("BANK")!,currency:"USD",debit:"0.01"},
          {accountId:z.accounts.get("CASH")!,currency:"USD",credit:"0.01"}]},actor,inner));
    });
    await tx.execute(sql`set constraints all immediate`);
    completed=true;throw sentinel;
  });}catch(e){if(e!==sentinel)throw e;}
  assert.equal(completed,true);
});
