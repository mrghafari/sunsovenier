import test from "node:test";
import assert from "node:assert/strict";
import {sql} from "drizzle-orm";
import {accountingDb} from "./db";
import {activateManualDocuments,manualActivationSchema,readManualActivation} from "./manual-activation";
import {pool} from "../../db";

test("manual activation requires both explicit confirmations and a reason",()=>{
  const command={companyId:1,reason:"Manager reviewed native posting",preserveLegacyConfirmed:true,baseCurrencyOnlyConfirmed:true};
  assert.ok(manualActivationSchema.safeParse(command).success);
  for(const changed of [
    {preserveLegacyConfirmed:false},{baseCurrencyOnlyConfirmed:false},{reason:""},{companyId:0},{foreignReady:true},
  ])assert.equal(manualActivationSchema.safeParse({...command,...changed}).success,false);
});

test("manual approval is authorized, audited, idempotent and preserves legacy/foreign evidence (rollback-only)",
  {skip:process.env.ACCOUNTING_MANUAL_ACTIVATION_DB_TEST!=="1",timeout:60000},async()=>{
    const rollback=new Error("ROLLBACK_MANUAL_ACTIVATION");
    let verified=false;
    try {
      await accountingDb.transaction(async tx=>{
        await tx.execute(sql`set local lock_timeout='8s'`);
        await tx.execute(sql`select pg_advisory_xact_lock(718392,0)`);
        const company=(await tx.execute(sql`select c.id from accounting_companies c
          join accounting_zero_starts z on z.company_id=c.id
          where c.is_active and accounting_posting_enabled(c.id) order by c.id limit 1`)).rows[0];
        assert.ok(company,"An already approved independent book is required for the rollback probe");
        const companyId=Number(company.id);
        const identity=(await tx.execute(sql`select id from users where is_active
          and accounting_pipeline_actor_allowed(id,'admin') order by id limit 1`)).rows[0];
        assert.ok(identity,"An actual active accounting manager is required");
        const actor={actorId:Number(identity.id),actorType:"admin" as const,canManage:true};
        const command={companyId,reason:"Rollback-only documentary native activation test",
          preserveLegacyConfirmed:true,baseCurrencyOnlyConfirmed:true};
        const before=await readManualActivation(companyId,tx);
        assert.equal(before.canActivate,true);
        const snapshot=async()=>JSON.stringify((await tx.execute(sql`
          select (select md5(coalesce(string_agg(to_jsonb(w)::text,',' order by w.id),'')) from customer_wallets w) wallets,
            (select md5(coalesce(string_agg(to_jsonb(o)::text,',' order by o.id),'')) from customer_orders o) orders,
            (select count(*) from accounting_journal_entries) journals,
            (select to_jsonb(s) from accounting_shipment_cutovers s where s.company_id=${companyId}) shipment,
            (select to_jsonb(z) from accounting_zero_starts z where z.company_id=${companyId}) boundary
        `)).rows[0]);
        const original=await snapshot();
        await assert.rejects(()=>activateManualDocuments(command,{...actor,canManage:false},tx),
          (e:any)=>e.code==="ACCESS_DENIED");
        const result=await activateManualDocuments(command,actor,tx);
        assert.equal(result.enabled,true);
        assert.equal(result.duplicate,before.approved);
        assert.equal((await activateManualDocuments(command,actor,tx)).duplicate,true);
        assert.equal(await snapshot(),original);
        const audit=(await tx.execute(sql`select count(*) n from accounting_audit_logs
          where company_id=${companyId} and action='manual_documents_activated'
            and "after"->>'reason'=${command.reason}`)).rows[0];
        assert.equal(Number(audit.n),before.approved?0:1);
        await tx.execute(sql`set constraints all immediate`);
        verified=true;
        throw rollback;
      });
    } catch(error) {if(error!==rollback)throw error;}
    assert.equal(verified,true);
    await pool.end();
  });
