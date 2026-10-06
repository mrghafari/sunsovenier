import test from "node:test";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {sql} from "drizzle-orm";
import {accountingDb} from "./db";
import {pool} from "../../db";
import {isAccountingSuperAdminRole} from "./access";
import {deleteAccountingCompany} from "./company-deletion";

test("only the canonical super-admin role and known legacy spelling are recognized",()=>{
  for(const name of ["super_admin"," Super Admin ","super-admin","Supper Admin"])
    assert.equal(isAccountingSuperAdminRole(name),true);
  for(const name of ["admin","finance_manager","superadmin","supper","",null])
    assert.equal(isAccountingSuperAdminRole(name),false);
});

test("company deletion is authorized, confirmed, non-destructive and atomic (rollback-only)",
 {skip:process.env.ACCOUNTING_COMPANY_DELETE_DB_TEST!=="1"},async t=>{
 const rollback=new Error("ROLLBACK_COMPANY_DELETE");let done=false;
 try{await accountingDb.transaction(async tx=>{
   await tx.execute(sql`select pg_advisory_xact_lock(718392,0)`);
   const superUser=(await tx.execute(sql`select u.id,ar.id role_id from users u join admin_roles ar on ar.id=u.role_id
     where u.is_active and ar.is_active and regexp_replace(lower(btrim(ar.name)),'[[:space:]-]+','_','g')
     in ('super_admin','supper_admin') order by u.id limit 1`)).rows[0];
   assert.ok(superUser,"Active super-admin fixture identity required");
   const actor={actorId:Number(superUser.id),actorType:"admin" as const,canManage:true,canDeleteCompanies:true};
   const make=async()=> (await tx.execute(sql`insert into accounting_companies(name,country_code,timezone,base_currency)
     values(${"Rollback delete "+randomUUID()},'IQ','Asia/Baghdad','IQD') returning id,name`)).rows[0];
   const company=await make(),id=Number(company.id);
   const confirm={confirmationName:String(company.name),deleteConfirmed:true};
   const rejected=async(fn:()=>Promise<unknown>,pattern:RegExp)=>{
     await tx.execute(sql`savepoint company_rejection`);
     try{await assert.rejects(fn,(e:unknown)=>{
       const error=e as {message?:string;cause?:{message?:string}};
       return pattern.test([error.message,error.cause?.message].join(" "));
     });}finally{await tx.execute(sql`rollback to savepoint company_rejection`);await tx.execute(sql`release savepoint company_rejection`);}
   };
   await t.test("custom actors, forged UI permission and inactive roles cannot delete",async()=>{
     await rejected(()=>deleteAccountingCompany(id,confirm,{...actor,actorType:"custom"},tx),/super admin/);
     await tx.execute(sql`savepoint non_super_role`);
     await tx.execute(sql`update admin_roles set name=${"ordinary_finance_"+randomUUID()} where id=${Number(superUser.role_id)}`);
     await rejected(()=>deleteAccountingCompany(id,confirm,actor,tx),/super admin/);
     await tx.execute(sql`rollback to savepoint non_super_role`);await tx.execute(sql`release savepoint non_super_role`);
     await tx.execute(sql`savepoint inactive_role`);
     await tx.execute(sql`update admin_roles set is_active=false where id=${Number(superUser.role_id)}`);
     await rejected(()=>deleteAccountingCompany(id,confirm,actor,tx),/super admin/);
     await tx.execute(sql`rollback to savepoint inactive_role`);await tx.execute(sql`release savepoint inactive_role`);
   });
   await t.test("explicit confirmation, current name and exact target are required",async()=>{
     await rejected(()=>deleteAccountingCompany(id,{...confirm,deleteConfirmed:false},actor,tx),/confirmation/);
     await rejected(()=>deleteAccountingCompany(id,{...confirm,confirmationName:"Different company"},actor,tx),/current company name/);
     await rejected(()=>deleteAccountingCompany(0,confirm,actor,tx),/Valid company/);
     await rejected(()=>deleteAccountingCompany(2147483647,confirm,actor,tx),/not found/);
   });
   await t.test("operationally bound companies cannot be deleted",async()=>{
     const binding=(await tx.execute(sql`select company_id from accounting_source_bindings limit 1`)).rows[0];
     assert.ok(binding);
     const target=(await tx.execute(sql`select name from accounting_companies where id=${Number(binding.company_id)}`)).rows[0];
     await rejected(()=>deleteAccountingCompany(Number(binding.company_id),
       {confirmationName:String(target.name),deleteConfirmed:true},actor,tx),/connected to an operational source/);
   });
   await t.test("an actual financial document blocks deletion",async()=>{
     await tx.execute(sql`savepoint financial_company`);
     const used=await make(),usedId=Number(used.id);
     const year=Number((await tx.execute(sql`insert into accounting_fiscal_years(company_id,name,starts_on,ends_on)
       values(${usedId},'Rollback period','2026-01-01','2026-12-31') returning id`)).rows[0].id);
     await tx.execute(sql`insert into accounting_journal_entries(company_id,fiscal_year_id,entry_date,description,
       source_type,source_id,source_hash,created_by,actor_type)
       values(${usedId},${year},'2026-10-06','Rollback draft financial document','ManualJournal',
       ${randomUUID()},${"b".repeat(64)},${actor.actorId},'admin')`);
     await rejected(()=>deleteAccountingCompany(usedId,
       {confirmationName:String(used.name),deleteConfirmed:true},actor,tx),/financial documents/);
     assert.equal((await tx.execute(sql`select deleted_at from accounting_companies where id=${usedId}`)).rows[0].deleted_at,null);
     await tx.execute(sql`rollback to savepoint financial_company`);await tx.execute(sql`release savepoint financial_company`);
   });
   await tx.execute(sql`insert into accounting_accounts(company_id,code,name_ar,name_en,type)
     values(${id},'1100','اختبار','Rollback Bank','asset')`);
   await t.test("late audit failure restores the company, including active state",async()=>{
     await tx.execute(sql`savepoint failed_audit`);
     await tx.execute(sql.raw(`create function accounting_fixture_delete_failure() returns trigger language plpgsql as $$
       begin if NEW.action='delete_company' then raise exception 'Fixture deletion audit failure';end if;return NEW;end $$;
       create trigger accounting_fixture_delete_failure before insert on accounting_audit_logs
       for each row execute function accounting_fixture_delete_failure();`));
     await rejected(()=>deleteAccountingCompany(id,confirm,actor,tx),/Fixture deletion audit failure/);
     const restored=(await tx.execute(sql`select is_active,deleted_at from accounting_companies where id=${id}`)).rows[0];
     assert.equal(restored.is_active,true);assert.equal(restored.deleted_at,null);
     await tx.execute(sql`rollback to savepoint failed_audit`);await tx.execute(sql`release savepoint failed_audit`);
   });
   await t.test("confirmed deletion hides and deactivates, preserves references and audits once",async()=>{
     assert.equal((await deleteAccountingCompany(id,confirm,actor,tx)).duplicate,false);
     assert.equal((await deleteAccountingCompany(id,confirm,actor,tx)).duplicate,true);
     const archived=(await tx.execute(sql`select is_active,deleted_at from accounting_companies where id=${id}`)).rows[0];
     assert.equal(archived.is_active,false);assert.ok(archived.deleted_at);
     assert.equal(Number((await tx.execute(sql`select count(*) n from accounting_companies where id=${id} and deleted_at is null`)).rows[0].n),0);
     assert.equal(Number((await tx.execute(sql`select count(*) n from accounting_accounts where company_id=${id}`)).rows[0].n),1);
     assert.equal(Number((await tx.execute(sql`select count(*) n from accounting_audit_logs where company_id=${id}
       and action='delete_company' and actor_id=${actor.actorId} and actor_type='admin'`)).rows[0].n),1);
     await rejected(()=>tx.execute(sql`update accounting_companies set is_active=true where id=${id}`),/accounting_deleted_company_inactive/);
   });
   done=true;throw rollback;
 });}catch(e){if(e!==rollback||!done)throw e;}
 finally{await pool.end();}
});
