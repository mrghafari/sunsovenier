import assert from "node:assert/strict";
import test from "node:test";
import {postingFailure} from "./posting-queue";
import {postingQueueSubmitSchema} from "@shared/accounting-posting-queue";
test("only frozen reviewed commands are accepted and native failures have bounded retries",()=>{
  const input={sourceId:"safe-source",reviewConfirmed:true,posting:{kind:"LOADING_INVOICE",
    command:{companyId:1,factId:2,expectedPlanHash:"a".repeat(64),reason:"Reviewed source",settleFromHold:false}}};
  assert.equal(postingQueueSubmitSchema.safeParse(input).success,true);
  assert.equal(postingQueueSubmitSchema.safeParse({...input,reviewConfirmed:false}).success,false);
  assert.equal(postingQueueSubmitSchema.safeParse({...input,posting:{...input.posting,autoEligible:true}}).success,false);
  assert.deepEqual(postingFailure({cause:{code:"40001"}},1),{code:"40001",status:"retry",delaySeconds:30});
  assert.equal(postingFailure({code:"ECONNRESET"},4).status,"retry");
  assert.equal(postingFailure({code:"ECONNRESET"},5).status,"review");
  for(const code of ["STALE_INVOICE_PLAN","LOADING_INVOICE_BLOCKED","ACCESS_DENIED","P0001"])
    assert.equal(postingFailure({code},1).status,"review");
  assert.equal(postingFailure({code:"private error with SQL parameters"},1).code,"POSTING_FAILED");
});
