import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {randomUUID,randomInt} from "node:crypto";
import {sql} from "drizzle-orm";
import {accountingDb} from "./db";
import {pool} from "../../db";
import {iraqChart} from "./iraq-chart";
import {activateZeroStart,readZeroStart} from "./zero-start";
import {linkWallet,readShopCustomerAccount,shouldDeferWalletCheckout,recordWalletMovement} from "./wallet";
import {readCustomerAccounts,createIndependentCustomerAccount,setCustomerAccountCreditLimit} from "./customer-accounts";
import {POSTING_KEYS} from "@shared/accounting-api";

test("independent zero start activates only an isolated book and preserves native balances (rollback-only)",
 {skip:process.env.ACCOUNTING_ZERO_START_DB_TEST!=="1"},async t=>{
 const rollback=new Error("ROLLBACK_ZERO_START");let finished=false;
 try{await accountingDb.transaction(async tx=>{
   await tx.execute(sql`select pg_advisory_xact_lock(718392,0)`);
   if(process.env.ACCOUNTING_ZERO_START_DRY_RUN==="1")
     await tx.execute(sql.raw(await readFile("server/modules/accounting/0057_prospective_zero_start.sql","utf8")));
   const actorId=Number((await tx.execute(sql`select id from users where accounting_pipeline_actor_allowed(id,'admin') order by id limit 1`)).rows[0]?.id);
   assert.ok(actorId,"An active admin finance-manager fixture identity is required");
   const actor={actorId,actorType:"admin" as const,canManage:true};
   const companyId=Number((await tx.execute(sql`insert into accounting_companies(name,country_code,timezone,base_currency)
     values(${"ROLLBACK independent zero "+randomUUID()},'IQ','Asia/Baghdad','IQD') returning id`)).rows[0].id);
   await tx.execute(sql`insert into accounting_fiscal_years(company_id,name,starts_on,ends_on)
     values(${companyId},'Rollback zero-start period','2026-01-01','2026-12-31')`);
   for(const key of POSTING_KEYS){
     const a=iraqChart.find(item=>item.key===key)!;assert.ok(a,key);
     const accountId=Number((await tx.execute(sql`insert into accounting_accounts(company_id,code,name_ar,name_en,type)
       values(${companyId},${a.code},${a.nameAr},${a.nameEn},${a.type}) returning id`)).rows[0].id);
     await tx.execute(sql`insert into accounting_posting_rules(company_id,key,account_id) values(${companyId},${key},${accountId})`);
   }
   await tx.execute(sql`insert into accounting_source_bindings(source_module,company_id,capture_enabled)
     values('shop',${companyId},true) on conflict(source_module) do update set company_id=excluded.company_id,capture_enabled=true`);
   const command={companyId,startsOn:"2026-10-06",reason:"Rollback explicitly declared independent zero opening",
     preserveLegacyConfirmed:true,zeroOpeningConfirmed:true};
   const legacy=(await tx.execute(sql`select id,customer_id from customer_wallets where currency='IQD' order by id limit 2`)).rows;
   assert.equal(legacy.length,2);
   const newAccount=async()=>{
     const id=1800000000+randomInt(1,1000000);
     await tx.execute(sql`insert into crm_customers(id,email,first_name,last_name)
       values(${id},${randomUUID()+"@example.invalid"},'Zero','Rollback fixture')`);
     return Number((await tx.execute(sql`insert into customer_wallets(customer_id,currency,balance)
       values(${id},'IQD',0) returning id`)).rows[0].id);
   };
   const oldZero=await newAccount();
   const original=(await tx.execute(sql`select jsonb_agg(to_jsonb(w) order by id) snapshot from customer_wallets w`)).rows[0].snapshot;
   const rejected=async(fn:()=>Promise<unknown>,pattern:RegExp)=>{
     await tx.execute(sql`savepoint zero_rejection`);
     try{await assert.rejects(fn,(e:unknown)=>{
       const error=e as {message?:string;cause?:{message?:string}};
       return pattern.test([error.message,error.cause?.message].join(" "));
     });}
     finally{await tx.execute(sql`rollback to savepoint zero_rejection`);await tx.execute(sql`release savepoint zero_rejection`);}
   };
   await t.test("viewer or unattributed system actor cannot activate",async()=>{
     await rejected(()=>activateZeroStart(command,{...actor,canManage:false},tx),/manager/i);
     await rejected(()=>activateZeroStart(command,{...actor,actorId:0,actorType:"system"},tx),/manager/i);
     assert.equal((await readZeroStart(companyId,tx)).approved,false);
   });
   await t.test("missing settings identify the exact fiscal period or mapping without activating",async()=>{
     await rejected(()=>activateZeroStart({...command,startsOn:"2025-10-06"},actor,tx),/No fiscal period.*2025-10-06/);
     await tx.execute(sql`savepoint missing_cheque_setting`);
     await tx.execute(sql`delete from accounting_posting_rules where company_id=${companyId} and key='CHEQUES_ON_HAND'`);
     await rejected(()=>activateZeroStart(command,actor,tx),/Missing or invalid posting mappings: CHEQUES_ON_HAND/);
     assert.equal((await readZeroStart(companyId,tx)).approved,false);
     await tx.execute(sql`rollback to savepoint missing_cheque_setting`);
     await tx.execute(sql`release savepoint missing_cheque_setting`);
   });
   await t.test("late failure rolls back every financial gate and zero approval",async()=>{
     await tx.execute(sql`savepoint zero_late_failure`);
     await tx.execute(sql.raw(`create function accounting_fixture_zero_failure() returns trigger language plpgsql as $$
       begin raise exception 'Fixture late zero activation failure';end $$;
       create trigger accounting_fixture_zero_failure before insert on accounting_wallet_refund_cutovers
       for each row execute function accounting_fixture_zero_failure();`));
     await rejected(()=>activateZeroStart(command,actor,tx),/Fixture late zero/);
     assert.equal((await readZeroStart(companyId,tx)).approved,false);
     assert.equal((await tx.execute(sql`select accounting_posting_enabled(${companyId}) enabled`)).rows[0].enabled,false);
     await tx.execute(sql`rollback to savepoint zero_late_failure`);await tx.execute(sql`release savepoint zero_late_failure`);
   });
   await t.test("zero approval is idempotent and does not invent a zero journal",async()=>{
     const result=await activateZeroStart(command,actor,tx);
     assert.equal(result.active,true);assert.equal(result.approved,true);assert.equal(result.duplicate,false);
     assert.equal((await activateZeroStart(command,actor,tx)).duplicate,true);
     await rejected(()=>activateZeroStart({...command,startsOn:"2026-10-05"},actor,tx),/immutable/i);
     assert.equal(Number((await tx.execute(sql`select count(*) n from accounting_journal_entries where company_id=${companyId}`)).rows[0].n),0);
     assert.deepEqual((await tx.execute(sql`select jsonb_agg(to_jsonb(w) order by id) snapshot from customer_wallets w`)).rows[0].snapshot,original);
   });
   await t.test("both nonzero and zero legacy wallets stay excluded; new zero accounts may link",async()=>{
     await rejected(()=>linkWallet(companyId,Number(legacy[0].id),actor,tx),/Legacy.*accounts/);
     await rejected(()=>linkWallet(companyId,oldZero,actor,tx),/Legacy.*accounts/);
     const newWallet=await newAccount();
     assert.equal((await linkWallet(companyId,newWallet,actor,tx)).duplicate,false);
     await rejected(()=>tx.execute(sql`delete from accounting_zero_starts where company_id=${companyId}`),/immutable/);
     await rejected(()=>tx.execute(sql`update accounting_zero_starts set first_order_id=1 where company_id=${companyId}`),/immutable/);
   });
   await t.test("historical orders and retrospective stock journals remain blocked",async()=>{
     const oldOrder=Number((await tx.execute(sql`select id from customer_orders order by id limit 1`)).rows[0].id);
     await rejected(()=>tx.execute(sql`insert into accounting_wallet_orders(order_id,wallet_id,company_id,snapshot)
       select ${oldOrder},wallet_id,${companyId},'{}'::jsonb from accounting_wallet_links where company_id=${companyId} limit 1`),/Historical orders/);
     // Trigger runs before ledger completion: no fake empty journal is authorized.
     await rejected(()=>tx.execute(sql`insert into accounting_journal_entries(company_id,fiscal_year_id,entry_date,
       description,source_type,source_id,source_hash,created_by,actor_type)
       select ${companyId},id,'2026-10-05','Rollback forbidden retrospective source','ManualJournal',
       ${randomUUID()},${"a".repeat(64)},${actorId},'admin' from accounting_fiscal_years where company_id=${companyId}`),/Retrospective/);
     assert.equal((await tx.execute(sql`select processing_ready from accounting_foreign_invoice_cutovers where company_id=${companyId}`)).rows.length,0);
   });
   await t.test("same CRM customer retains legacy wallet while independent company accounts start at zero",async()=>{
     const customerId=1801000000+randomInt(1,100000);
     const customerCode=String((await tx.execute(sql`insert into crm_customers(id,email,first_name,last_name)
       values(${customerId},${randomUUID()+"@example.invalid"},'Independent','Rollback') returning customer_code`)).rows[0].customer_code);
     const legacyId=Number((await tx.execute(sql`insert into customer_wallets(customer_id,currency,balance,created_at)
       values(${customerId},'IQD',123,'2026-01-01') returning id`)).rows[0].id);
     const legacyBefore=(await tx.execute(sql`select to_jsonb(w) data from customer_wallets w where id=${legacyId}`)).rows[0].data;
     const input={companyId,customerCode,currency:"IQD" as const,reason:"Rollback independent customer account evidence",independentConfirmed:true};
     assert.equal(await shouldDeferWalletCheckout(customerId,tx),false);
     await rejected(()=>createIndependentCustomerAccount(input,{...actor,canManage:false},tx),/manager/i);
     await rejected(()=>createIndependentCustomerAccount({...input,independentConfirmed:false},actor,tx),/confirmation/i);
     const result=await createIndependentCustomerAccount(input,actor,tx);
     assert.equal(result.duplicate,false);
     assert.equal(result.legacyBalancesChanged,false);
     assert.notEqual(result.walletId,legacyId);
     assert.equal((await createIndependentCustomerAccount(input,actor,tx)).walletId,result.walletId);
     const info=await readCustomerAccounts({companyId,customerCode},tx);
     assert.equal(info.accounts.length,1);
     assert.equal(info.accounts[0].balance,"0.00");
     assert.equal(info.legacyAccounts.length,1);
     assert.equal(info.legacyAccounts[0].balance,"123.00");
     assert.equal(await shouldDeferWalletCheckout(customerId,tx),true);
     assert.equal((await readShopCustomerAccount(customerId,tx))?.walletId,result.walletId);
     assert.equal((await readShopCustomerAccount(customerId,tx))?.availableBalance,"0.00");
     const deposit={companyId,walletId:result.walletId,sourceId:randomUUID(),entryDate:"2026-10-13",amount:"100",
       channel:"BANK" as const,evidenceReference:"Rollback bank receipt evidence",reason:"Rollback documented new deposit"};
     const posted=await recordWalletMovement("topup",deposit,actor,tx);
     assert.equal(posted.duplicate,false);
     assert.equal((await recordWalletMovement("topup",deposit,actor,tx)).duplicate,true);
     assert.equal((await readShopCustomerAccount(customerId,tx))?.availableBalance,"100.00");
     const credit={companyId,walletId:result.walletId,creditLimit:"250",reason:"Rollback documented credit authorization",confirmed:true};
     await rejected(()=>setCustomerAccountCreditLimit(credit,{...actor,canManage:false},tx),/manager/i);
     const policy=await setCustomerAccountCreditLimit(credit,actor,tx);
     assert.equal(policy.creditLimit,"250");
     assert.equal(policy.balanceChanged,false);
     assert.equal((await setCustomerAccountCreditLimit(credit,actor,tx)).duplicate,true);
     assert.equal((await readShopCustomerAccount(customerId,tx))?.availableBalance,"100.00");
     assert.deepEqual((await tx.execute(sql`select to_jsonb(w) data from customer_wallets w where id=${legacyId}`)).rows[0].data,legacyBefore);
     await rejected(()=>tx.execute(sql`update customer_wallets set accounting_company_id=${companyId} where id=${legacyId}`),/identity/i);
     await rejected(()=>tx.execute(sql`insert into customer_wallets(customer_id,currency,balance) values(${customerId},'USD',0)`),/unique/i);
     await rejected(()=>tx.execute(sql`insert into customer_wallets(customer_id,accounting_company_id,currency,balance)
       values(${customerId},${companyId},'USD',1)`),/zero initial/i);
     await rejected(()=>tx.execute(sql`update customer_wallets set currency='USD' where id=${result.walletId}`),/identity/i);
     await createIndependentCustomerAccount({...input,currency:"USD"},actor,tx);
     assert.equal((await readCustomerAccounts({companyId,customerCode},tx)).accounts.length,2);
     assert.equal((await readShopCustomerAccount(customerId,tx))?.currency,"IQD");
     await tx.execute(sql`update customer_wallets set status='frozen' where id=${result.walletId}`);
     await rejected(()=>shouldDeferWalletCheckout(customerId,tx),/not active/i);
     await rejected(()=>readShopCustomerAccount(customerId,tx),/not active/i);
   });
   const existingCompanyId=Number(process.env.ACCOUNTING_ZERO_START_VERIFY_EXISTING_COMPANY);
   if(Number.isSafeInteger(existingCompanyId)&&existingCompanyId>0){
     await t.test("existing company configuration supports the complete activation path without committing",async()=>{
       await tx.execute(sql`savepoint existing_company_probe`);
       try{
         await tx.execute(sql`update accounting_source_bindings set company_id=${existingCompanyId} where source_module='shop'`);
         const before=await readZeroStart(existingCompanyId,tx);
         const walletsBefore=(await tx.execute(sql`select jsonb_agg(to_jsonb(w) order by id) snapshot from customer_wallets w`)).rows[0].snapshot;
         const result=await activateZeroStart({...command,companyId:existingCompanyId},actor,tx);
         assert.equal(result.approved,true);assert.equal(result.active,true);
         assert.deepEqual((await tx.execute(sql`select jsonb_agg(to_jsonb(w) order by id) snapshot from customer_wallets w`)).rows[0].snapshot,walletsBefore);
         await tx.execute(sql`rollback to savepoint existing_company_probe`);
         assert.deepEqual(await readZeroStart(existingCompanyId,tx),before);
       }finally{await tx.execute(sql`rollback to savepoint existing_company_probe`);await tx.execute(sql`release savepoint existing_company_probe`);}
     });
   }
   finished=true;throw rollback;
 });}catch(e){if(e!==rollback||!finished)throw e;}
 finally{await pool.end();}
});
