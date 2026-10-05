import test from "node:test";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {sql} from "drizzle-orm";
import {accountingDb} from "./db";
import {pool} from "../../db";
import {saveInventoryDocument,actInventoryDocument,readInventoryDocumentMetadata} from "./inventory-documents";
import {readCapitalizationWorkbench,capitalizeInventoryDocument} from "./inventory-capitalization";
import {reverseJournalEntry} from "./postJournalEntry";
import {iraqChart} from "./iraq-chart";
test("actual stock capitalization commits originals and all layers atomically (rollback-only)",
  {skip:process.env.ACCOUNTING_DB_TEST!=="1"},async t=>{
  const rollback=new Error("ROLLBACK_CAPITALIZATION");let finished=false;
  try{await accountingDb.transaction(async tx=>{
    await tx.execute(sql`select pg_advisory_xact_lock(718392,0)`);
    const role=(await tx.execute(sql`select id from admin_roles where is_active and
      lower(regexp_replace(btrim(name),'[[:space:]-]+','_','g')) in ('super_admin','supper_admin','admin') limit 1`)).rows[0];
    assert.ok(role);
    const actorId=Number((await tx.execute(sql`insert into users(username,email,password_hash,role_id)
      values(${"disabled-capital-"+randomUUID()},${randomUUID()+"@example.invalid"},'disabled-fixture-hash',${role.id}) returning id`)).rows[0].id);
    const actor={actorId,actorType:"admin" as const,canManage:true};
    const companyId=Number((await tx.execute(sql`insert into accounting_companies(name,country_code,timezone,base_currency)
      values(${"Capitalization fixture "+randomUUID()},'IQ','Asia/Baghdad','IQD') returning id`)).rows[0].id);
    await tx.execute(sql`insert into accounting_fiscal_years(company_id,name,starts_on,ends_on)
      values(${companyId},'Rollback period','2026-01-01','2026-12-31')`);
    const accounts=new Map<string,number>();
    for(const key of ["INVENTORY","OPENING_BALANCE_EQUITY"]){
      const a=iraqChart.find(x=>x.key===key)!;
      const id=Number((await tx.execute(sql`insert into accounting_accounts(company_id,code,name_ar,name_en,type)
        values(${companyId},${a.code},${a.nameAr},${a.nameEn},${a.type}) returning id`)).rows[0].id);
      accounts.set(key,id);await tx.execute(sql`insert into accounting_posting_rules(company_id,key,account_id) values(${companyId},${key},${id})`);
    }
    const payable=Number((await tx.execute(sql`insert into accounting_accounts(company_id,code,name_ar,name_en,type)
      values(${companyId},'2195','Fixture trade payable','Fixture trade payable','liability') returning id`)).rows[0].id);
    const productId=(await readInventoryDocumentMetadata(companyId,tx)).products[0].id;
    const catalogBefore=(await tx.execute(sql`select to_jsonb(p) as data from shop_products p where id=${productId}`)).rows[0].data;
    const doc=async(kind:"opening"|"purchase",currency:string,costs:string[],date="2026-06-01")=>{
      let d=await saveInventoryDocument({companyId,sourceId:randomUUID(),kind,reference:randomUUID(),documentDate:date,
        supplier:kind==="purchase"?"Rollback supplier invoice":"",currency,evidenceReference:"Rollback actual document proof",notes:"",
        lines:costs.map(totalCost=>({productId,batchReference:randomUUID(),quantityTons:"1",totalCost}))},actor,tx);
      d=await actInventoryDocument(d.id,"approve",{companyId,revision:d.revision,reason:"Review actual rollback source"},actor,tx);return d;
    };
    const opening=await doc("opening","IQD",["100","200"]);
    const plan=async(id:number)=>(await readCapitalizationWorkbench({companyId},tx)).rows.find(x=>x.documentId===id)!;
    const command=async(id:number)=>({companyId,documentId:id,expectedPlanHash:(await plan(id)).planHash,reason:"Reviewed rollback capitalization"});
    const capital=async(input:unknown)=>{
      try{return await capitalizeInventoryDocument(input,actor,tx);}
      catch(e){console.error("Capitalization database cause:",(e as {cause?:{message?:string;where?:string}}).cause);throw e;}
    };
    const reject=async(fn:()=>Promise<unknown>)=>{
      await tx.execute(sql`savepoint rejection`);let error:unknown;
      try{await fn();}catch(e){error=e;}finally{await tx.execute(sql`rollback to savepoint rejection`);await tx.execute(sql`release savepoint rejection`);}
      assert.ok(error,"Expected rejection");
    };
    await t.test("closed gates and invalid actors cannot create a journal or layer",async()=>{
      assert.ok((await plan(opening.id)).blockers.includes("CAPITALIZATION_CLOSED"));
      await reject(async()=>capitalizeInventoryDocument(await command(opening.id),actor,tx));
      await reject(async()=>capitalizeInventoryDocument(await command(opening.id),{...actor,canManage:false},tx));
      assert.equal((await tx.execute(sql`select count(*) as n from accounting_stock_books where company_id=${companyId}`)).rows[0].n,"0");
    });
    // Only this temporary company is enabled; the entire transaction rolls back.
    await tx.execute(sql`insert into accounting_inventory_capitalization_cutovers(company_id,processing_ready,purchase_payable_account_id,reviewed_by,evidence_reference)
      values(${companyId},true,${payable},${actorId},'Rollback-only reviewed actual stock source')`);
    let posted:Awaited<ReturnType<typeof capitalizeInventoryDocument>>|undefined;
    await t.test("opening recognizes actual base stock and every immutable layer, without changing catalog",async()=>{
      const p=await plan(opening.id);assert.deepEqual(p.blockers,[]);assert.equal(p.baseTotal,"300");
      const input=await command(opening.id);posted=await capital(input);
      assert.equal(posted.bookIds.length,2);assert.equal((await capitalizeInventoryDocument(input,actor,tx)).duplicate,true);
      assert.equal((await tx.execute(sql`select accounting_stock_ledger_reconciled(${companyId}) as ok`)).rows[0].ok,true);
      assert.deepEqual((await tx.execute(sql`select to_jsonb(p) as data from shop_products p where id=${productId}`)).rows[0].data,catalogBefore);
      await reject(()=>capitalizeInventoryDocument({...input,reason:"Different financial command"},actor,tx));
      await reject(()=>reverseJournalEntry(posted.journalId,"2026-06-02","Cannot independently reverse capitalized stock",actor,tx));
      await reject(()=>actInventoryDocument(opening.id,"void",{companyId,revision:opening.revision,reason:"Cannot detach original stock proof"},actor,tx));
    });
    if(!posted)throw new Error("Opening fixture did not post; stop dependent tests");
    const purchase=await doc("purchase","IQD",["50","70"],"2026-06-02");
    await t.test("a second composed operation recognizes supplier invoice liability, not a bank payment",async()=>{
      const p=await plan(purchase.id);assert.equal(p.counterAccount?.id,payable);
      const result=await capital(await command(purchase.id));
      const credit=(await tx.execute(sql`select account_id,currency,credit::text from accounting_journal_lines where entry_id=${result.journalId} and credit>0`)).rows[0];
      assert.equal(Number(credit.account_id),payable);assert.equal(credit.credit,"120.00000000");
      assert.equal((await tx.execute(sql`select accounting_stock_ledger_reconciled(${companyId}) as ok`)).rows[0].ok,true);
    });
    const foreign=await doc("purchase","USD",["0.01","0.01","0.01"],"2026-06-03");
    await t.test("foreign acquisition requires a real dated official rate and preserves cumulative base value",async()=>{
      assert.ok((await plan(foreign.id)).blockers.includes("OFFICIAL_RATE_REQUIRED"));
      await tx.execute(sql`insert into accounting_exchange_rates(company_id,currency,effective_on,rate,source,reference)
        values(${companyId},'USD','2026-06-03',150,'central_bank','Rollback documented historical rate')`);
      const p=await plan(foreign.id);assert.equal(p.baseTotal,"5");assert.deepEqual(p.lines.map(l=>l.baseCost),["2","1","2"]);
      const stale={...await command(foreign.id),expectedPlanHash:"a".repeat(64)};await reject(()=>capitalizeInventoryDocument(stale,actor,tx));
      const input=await command(foreign.id);const result=await capital(input);
      await tx.execute(sql`update accounting_exchange_rates set rate=160 where company_id=${companyId} and currency='USD'`);
      assert.equal((await capitalizeInventoryDocument(input,actor,tx)).journalId,result.journalId);
      assert.equal((await plan(foreign.id)).baseTotal,"5");
    });
    const unknownOpening=await doc("opening","USD",["10"]);
    await t.test("foreign opening is not invented from a purchase/current rate",async()=>{
      assert.ok((await plan(unknownOpening.id)).blockers.includes("FOREIGN_OPENING_CARRYING_REQUIRED"));
      assert.equal((await plan(unknownOpening.id)).baseTotal,null);
      await reject(async()=>capitalizeInventoryDocument(await command(unknownOpening.id),actor,tx));
    });
    const failure=await doc("purchase","IQD",["10","20"],"2026-06-04");
    await t.test("failure after the first layer rolls back its journal and all layers even when caller catches it",async()=>{
      const fn="capital_fail_"+actorId;
      await tx.execute(sql`create function ${sql.identifier(fn)}() returns trigger language plpgsql as
        $$ begin if NEW.line_index=1 then raise exception 'capital fixture downstream failure'; end if; return NEW; end $$`);
      await tx.execute(sql`create trigger ${sql.identifier(fn)} before insert on accounting_stock_books for each row execute function ${sql.identifier(fn)}()`);
      await assert.rejects(async()=>capitalizeInventoryDocument(await command(failure.id),actor,tx));
      assert.equal((await tx.execute(sql`select count(*) as n from accounting_stock_books where document_id=${failure.id}`)).rows[0].n,"0");
      assert.equal((await tx.execute(sql`select count(*) as n from accounting_journal_entries where company_id=${companyId} and source_type='InventoryPurchase' and source_id=${String(failure.id)}`)).rows[0].n,"0");
      await tx.execute(sql`drop trigger ${sql.identifier(fn)} on accounting_stock_books`);await tx.execute(sql`drop function ${sql.identifier(fn)}()`);
      assert.equal((await capitalizeInventoryDocument(await command(failure.id),actor,tx)).bookIds.length,2);
    });
    finished=true;throw rollback;
  });}catch(e){if(e!==rollback)throw e;}finally{await pool.end();}assert.ok(finished);
});
