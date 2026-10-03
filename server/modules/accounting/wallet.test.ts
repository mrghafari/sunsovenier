import test from "node:test";
import assert from "node:assert/strict";
import {randomInt,randomUUID} from "node:crypto";
import {sql} from "drizzle-orm";
import {accountingDb} from "./db";
import {pool} from "../../db";
import {linkWallet,prepareWalletOrder,recordWalletMovement,approveWalletOrder,walletMovementSchema} from "./wallet";
import {iraqChart} from "./iraq-chart";
import {postJournalEntry} from "./postJournalEntry";

test("prepaid customer money is liability and movement amounts are strings",()=>{
  assert.equal(iraqChart.find(a=>a.key==="WALLET_LIABILITY")?.type,"liability");
  assert.equal(iraqChart.find(a=>a.key==="GATEWAY")?.type,"asset");
  assert.equal(walletMovementSchema.safeParse({companyId:1,walletId:1,sourceId:"bank-1",entryDate:"2026-06-01",
    amount:100,channel:"BANK",evidenceReference:"receipt-1",reason:"Deposit"}).success,false);
});
test("new prepaid wallet integration: rollback-only",{skip:process.env.ACCOUNTING_DB_TEST!=="1"},async t=>{
  const sentinel=new Error("ROLLBACK_WALLET_TEST");
  let finished=false;
  try{
    await accountingDb.transaction(async tx=>{
      await tx.execute(sql`select pg_advisory_xact_lock(718392,0)`);
      const company=(await tx.execute(sql`insert into accounting_companies(name,country_code,timezone,base_currency)
        values('Wallet rollback fixture','IQ','Asia/Baghdad','IQD') returning id`)).rows[0].id as number;
      await tx.execute(sql`insert into accounting_fiscal_years(company_id,name,starts_on,ends_on)
        values(${company},'2026','2026-01-01','2026-12-31')`);
      for(const key of ["BANK","GATEWAY","WALLET_LIABILITY"]){
        const a=iraqChart.find(a=>a.key===key)!;
        const account=(await tx.execute(sql`insert into accounting_accounts(company_id,code,name_ar,name_en,type)
          values(${company},${a.code},${a.nameAr},${a.nameEn},${a.type}) returning id`)).rows[0].id;
        await tx.execute(sql`insert into accounting_posting_rules(company_id,key,account_id) values(${company},${key},${account})`);
      }
      await tx.execute(sql`insert into accounting_source_bindings(source_module,company_id,capture_enabled)
        values('shop',${company},true) on conflict(source_module) do update set company_id=excluded.company_id,capture_enabled=true`);
      await tx.execute(sql`insert into accounting_wallet_cutovers(company_id) values(${company})`);
      const fixture=1900000000+randomInt(1,1000000);
      await tx.execute(sql`insert into crm_customers(id,email,first_name,last_name)
        values(${fixture},${randomUUID()+"@example.invalid"},'Wallet','Fixture')`);
      await tx.execute(sql`insert into customer_wallets(id,customer_id,balance,currency,credit_limit)
        values(${fixture},${fixture},0,'IQD',1000)`);
      const actor={actorId:1,actorType:"admin" as const,canManage:true};
      const input={companyId:company,walletId:fixture,sourceId:"funding-1",entryDate:"2026-06-01",
        amount:"100",channel:"BANK" as const,evidenceReference:"bank-statement-1",reason:"Customer prepaid deposit"};
      await linkWallet(company,fixture,actor,tx);
      const balance=async()=>String((await tx.execute(sql`select balance::text as balance from customer_wallets where id=${fixture}`)).rows[0].balance);
      async function rejects(action:()=>Promise<unknown>){
        await tx.execute(sql`savepoint wallet_failure`);
        let e:unknown;try{await action();}catch(error){e=error;}
        await tx.execute(sql`rollback to savepoint wallet_failure`);
        await tx.execute(sql`release savepoint wallet_failure`);
        assert.ok(e,"Operation must fail");
      }
      const order=async(id:number,total:string,created="2026-06-01",currency="IQD",paid=false)=>{
        await tx.execute(sql`insert into customer_orders(id,order_number,customer_id,total_amount,currency,
          shipping_address,payment_method,payment_status,created_at) values(${id},${randomUUID()},${fixture},
          ${total},${currency},'{}','wallet_full',${paid?"paid":"pending"},${created}::timestamp)`);
        await tx.execute(sql`insert into order_items(id,order_id,product_name,product_sku,quantity,unit_price,total_price)
          values(${id},${id},'Wallet fixture','WALLET-FIXTURE',1,${total},${total})`);
      };
      await t.test("closed activation gate cannot change company/customer money",async()=>{
        await rejects(()=>recordWalletMovement("topup",input,actor,tx));
        assert.equal(await balance(),"0.00");
      });
      // This is a temporary test proof only, never a live activation operation.
      await tx.execute(sql`update accounting_wallet_cutovers set pipeline_ready=true,
        enabled_at='2026-01-01',opening_reference='rollback zero opening proof',reviewed_by=1 where company_id=${company}`);
      await t.test("bank top-up commits liability, native balance and source evidence together",async()=>{
        const posted=await recordWalletMovement("topup",input,actor,tx);
        assert.ok(posted.journalId);assert.equal(await balance(),"100.00");
        const liab=(await tx.execute(sql`select sum(l.credit-l.debit)::text as value from accounting_journal_lines l
          join accounting_journal_entries e on e.id=l.entry_id where e.company_id=${company}
          and l.party_type='customer' and l.party_id=${fixture}`)).rows[0].value;
        assert.equal(liab,"100.00000000");
        assert.equal((await recordWalletMovement("topup",{...input,amount:"100.00"},actor,tx)).journalId,posted.journalId);
        assert.equal(await balance(),"100.00");
        await rejects(()=>recordWalletMovement("topup",{...input,amount:"101"},actor,tx));
      });
      await t.test("fractional IQD, viewer operations, storage overflow fail without partial writes",async()=>{
        await rejects(()=>recordWalletMovement("topup",{...input,sourceId:"bad-decimals",amount:"0.01"},actor,tx));
        await rejects(()=>recordWalletMovement("topup",{...input,sourceId:"bad-role"},{...actor,canManage:false},tx));
        await rejects(()=>recordWalletMovement("topup",{...input,sourceId:"too-large",amount:"10000000000"},actor,tx));
        assert.equal(await balance(),"100.00");
      });
      await t.test("new/old/paid/currency boundary is enforced",async()=>{
        await order(fixture,"80");
        await prepareWalletOrder(fixture,fixture,tx);
        await order(fixture+1,"20","2025-01-01");
        await rejects(()=>prepareWalletOrder(fixture+1,fixture,tx));
        await order(fixture+2,"20","2026-06-01","USD");
        await rejects(()=>prepareWalletOrder(fixture+2,fixture,tx));
        await order(fixture+3,"20","2026-06-01","IQD",true);
        await rejects(()=>prepareWalletOrder(fixture+3,fixture,tx));
      });
      await t.test("finance hold blocks money but creates no revenue/journal/debit; retry is safe",async()=>{
        const countBefore=(await tx.execute(sql`select count(*) as n from accounting_journal_entries where company_id=${company}`)).rows[0].n;
        await approveWalletOrder(fixture,"Confirmed prepaid order",actor,tx);
        assert.equal(await balance(),"100.00");
        const hold=(await tx.execute(sql`select amount::text as amount from accounting_wallet_holds where order_id=${fixture}`)).rows[0];
        assert.equal(hold.amount,"80.00000000");
        assert.equal((await approveWalletOrder(fixture,"Retry",actor,tx)).duplicate,true);
        assert.equal((await tx.execute(sql`select count(*) as n from accounting_journal_entries where company_id=${company}`)).rows[0].n,countBefore);
        assert.equal((await tx.execute(sql`select payment_status from customer_orders where id=${fixture}`)).rows[0].payment_status,"pending");
      });
      await t.test("credit limit is not prepaid cash and competing orders cannot over-hold",async()=>{
        await order(fixture+4,"30");
        await rejects(()=>prepareWalletOrder(fixture+4,fixture,tx));
        await tx.execute(sql`insert into accounting_wallet_orders(order_id,wallet_id,company_id,snapshot)
          select id,${fixture},${company},accounting_order_event_snapshot(id) from customer_orders where id=${fixture+4}`);
        await rejects(()=>approveWalletOrder(fixture+4,"Insufficient funds",actor,tx));
        assert.equal((await tx.execute(sql`select count(*) as n from accounting_wallet_holds where wallet_id=${fixture}`)).rows[0].n,"1");
      });
      await t.test("refund cannot spend blocked funds; allowed refund debits liability, not revenue",async()=>{
        await rejects(()=>recordWalletMovement("refund",{...input,sourceId:"refund-over",amount:"30"},actor,tx));
        const r=await recordWalletMovement("refund",{...input,sourceId:"refund-1",amount:"10",reason:"Return excess prepaid funds"},actor,tx);
        assert.ok(r.journalId);assert.equal(await balance(),"90.00");
        assert.equal((await recordWalletMovement("refund",{...input,sourceId:"refund-1",amount:"10",reason:"Return excess prepaid funds"},actor,tx)).duplicate,true);
      });
      await t.test("cancellation releases a hold in the native transaction and never refunds twice",async()=>{
        await tx.execute(sql`update customer_orders set status='cancelled' where id=${fixture}`);
        assert.equal((await tx.execute(sql`select status from accounting_wallet_holds where order_id=${fixture}`)).rows[0].status,"released");
        assert.equal(await balance(),"90.00");
        await rejects(()=>approveWalletOrder(fixture,"Retry after cancellation",actor,tx));
      });
      await t.test("gateway funding uses its mapped asset and GL drift fails closed",async()=>{
        await recordWalletMovement("topup",{...input,sourceId:"gateway-1",channel:"GATEWAY",amount:"10"},actor,tx);
        assert.equal(await balance(),"100.00");
        await tx.execute(sql`savepoint simulated_drift`);
        const bank=(await tx.execute(sql`select account_id from accounting_posting_rules where company_id=${company} and key='BANK'`)).rows[0].account_id as number;
        const liability=(await tx.execute(sql`select account_id from accounting_posting_rules where company_id=${company} and key='WALLET_LIABILITY'`)).rows[0].account_id as number;
        await postJournalEntry({companyId:company,entryDate:"2026-06-01",sourceType:"ManualJournal",sourceId:"drift-fixture",
          description:"Rollback-only mismatch",lines:[
            {accountId:bank,currency:"IQD",debit:"1",credit:"0"},
            {accountId:liability,currency:"IQD",debit:"0",credit:"1",partyType:"customer",partyId:fixture},
          ]},actor,tx);
        await rejects(()=>recordWalletMovement("topup",{...input,sourceId:"drift-check",amount:"10"},actor,tx));
        await tx.execute(sql`rollback to savepoint simulated_drift`);
        await tx.execute(sql`release savepoint simulated_drift`);
        assert.equal(await balance(),"100.00");
      });
      await t.test("legacy/native writes cannot corrupt a financially controlled prepaid wallet",async()=>{
        await rejects(async()=>{await tx.execute(sql`update customer_wallets set balance=99 where id=${fixture}`);});
        await rejects(async()=>{await tx.execute(sql`insert into wallet_transactions(wallet_id,customer_id,
          transaction_type,amount,currency,balance_before,balance_after,description,status)
          values(${fixture},${fixture},'debit',1,'IQD',100,99,'Unsafe legacy debit','completed')`);});
        assert.equal(await balance(),"100.00");
      });
      finished=true;throw sentinel;
    });
  }catch(e){if(e!==sentinel)throw e;}
  finally{await pool.end();}
  assert.equal(finished,true);
});