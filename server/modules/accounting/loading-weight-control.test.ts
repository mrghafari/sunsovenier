import test from "node:test";
import assert from "node:assert/strict";
import {aggregateWeightAllowanceSchema} from "@shared/contract-draft";
import {calculateLoadingWeightControl,capturedContractEvidence,type LoadingContractEvidence} from "./loading-weight-control";
const evidence:LoadingContractEvidence={orderId:1,contractId:2,contractNumber:"C2611111",
  allowance:{basis:"percent",value:"2"},provenance:"order-contract-snapshot"};
const fact=(reference:string,weight:string,quantity="25",unit="tons")=>({
  input:{eventType:"LoadingCompleted",orderId:1,sourceId:reference,weighbridgeReference:"ticket-"+reference,
    actualWeightTons:weight,lines:[{orderItemId:1,actualWeightTons:weight}]},
  order:{version:1,companyId:1,orderId:1,lines:[{orderItemId:1,quantity,unit}]},
});
test("aggregate clause accepts exact zero and rejects absent, non-decimal or excessive percentages",()=>{
  assert.ok(aggregateWeightAllowanceSchema.safeParse({basis:"percent",value:"0"}).success);
  assert.ok(aggregateWeightAllowanceSchema.safeParse({basis:"percent",value:"100"}).success);
  for(const value of ["-1","100.00000001","1e1","2%","0.123456789","Infinity"])
    assert.equal(aggregateWeightAllowanceSchema.safeParse({basis:"percent",value}).success,false);
  assert.equal(aggregateWeightAllowanceSchema.safeParse(undefined).success,false);
});
test("multiple loadings use cumulative total, not individual truck weight",()=>{
  const within=calculateLoadingWeightControl([fact("a","24.350"),fact("b","1.150")],evidence);
  assert.equal(within.status,"WITHIN_CONTRACT");assert.equal(within.loadedWeightTons,"25.5");
  assert.equal(within.allowedWeightTons,"25.5");assert.equal(within.excessWeightTons,"0.5");
  const over=calculateLoadingWeightControl([fact("a","24.350"),fact("b","1.15000001")],evidence);
  assert.equal(over.status,"CONTRACT_LIMIT_EXCEEDED");assert.equal(over.reviewDepartment,"commercial");
  assert.equal(over.postingAllowed,false);
});
test("explicit zero is not a missing agreement and kg converts exactly",()=>{
  const zero={...evidence,allowance:{basis:"percent" as const,value:"0"}};
  assert.equal(calculateLoadingWeightControl([fact("a","25.00000001","25000","kg")],zero).status,"CONTRACT_LIMIT_EXCEEDED");
  assert.equal(calculateLoadingWeightControl([fact("a","25","25000","kg")],zero).allowedWeightTons,"25");
  assert.equal(calculateLoadingWeightControl([fact("a","25")],null).status,"CONTRACT_TERMS_REQUIRED");
  assert.equal(calculateLoadingWeightControl([fact("a","25")],{...evidence,orderId:99}).status,"CONTRACT_TERMS_REQUIRED");
});
test("package weights, legacy snapshots, conflicting quantities and malformed history fail explicitly",()=>{
  assert.equal(calculateLoadingWeightControl([fact("a","25","25","bags")],evidence).status,"ORDER_WEIGHT_REQUIRED");
  assert.equal(calculateLoadingWeightControl([fact("a","10"),fact("b","10","26")],evidence).status,"ORDER_WEIGHT_REQUIRED");
  assert.equal(calculateLoadingWeightControl([fact("a","10"),fact("a","10")],evidence).status,"INVALID_LOADING_HISTORY");
  const malformed=fact("a","25");malformed.input.lines[0].actualWeightTons="24";
  assert.equal(calculateLoadingWeightControl([malformed],evidence).status,"INVALID_LOADING_HISTORY");
});
test("new captures freeze contractual evidence and never gain a later clause retroactively",()=>{
  const p={...fact("a","25"),contractEvidence:evidence};
  assert.deepEqual(capturedContractEvidence([p],{...evidence,allowance:{basis:"percent",value:"99"}}),evidence);
  assert.equal(capturedContractEvidence([{...fact("a","25"),contractEvidence:null}],evidence),null);
  assert.equal(capturedContractEvidence([p,{...fact("b","1"),contractEvidence:null}],evidence),null);
  assert.equal(capturedContractEvidence([p,{...fact("b","1"),contractEvidence:{...evidence,allowance:{basis:"percent",value:"3"}}}],evidence),null);
});
