import test from "node:test";
import assert from "node:assert/strict";
import {accountingAuditFiltersSchema} from "@shared/accounting-audit";
import {accountingAuditCsv} from "./audit-reports";
test("audit filters reject invalid dates/unsafe IDs/mutation fields and retain system actor zero",()=>{
  const f={companyId:1,from:"2026-10-04",to:"2026-10-04"};
  assert.ok(accountingAuditFiltersSchema.safeParse({...f,actorId:0}).success);
  for(const x of [{to:"2026-10-03"},{from:"2026-02-30"},{actorId:-1},{pageSize:201},{post:true},{action:""}])
    assert.equal(accountingAuditFiltersSchema.safeParse({...f,...x}).success,false);
});
test("audit CSV retains UTC timestamps and scope metadata without exposing stored JSON",()=>{
  const csv=accountingAuditCsv({company:{id:1,name:"=unsafe",timezone:"Asia/Baghdad"},
    filters:{companyId:1,from:"2026-10-04",to:"2026-10-04",page:1,pageSize:50},pagination:{page:1,pageSize:50,totalRows:1},
    rows:[{id:1,actorId:0,actorType:"system",action:"=danger",entityType:"company",entityId:"@formula",
      createdAt:"2026-10-03T22:00:00.000Z",hasBefore:false,hasAfter:true}],
    scope:"selected-company-accounting-only",dateBasis:"company-local-day",includesGlobalActions:false,snapshotPayloadsExposed:false});
  assert.ok(csv.startsWith("\ufeff"));assert.match(csv,/'=unsafe/);assert.match(csv,/'=danger/);
  assert.match(csv,/'@formula/);assert.match(csv,/company-local-day/);
  assert.match(csv,/2026-10-03T22:00:00.000Z/);assert.match(csv,/"snapshotPayloadsExposed","false"/);
  assert.ok(!csv.includes('"before"'));
});