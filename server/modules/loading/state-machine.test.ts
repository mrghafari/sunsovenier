import {test} from "node:test";
import assert from "node:assert/strict";
import {transitionLoading,type TransitionEvidence} from "./state-machine";
import {LOADING_ROLES,LOADING_STATES,ROLE_SECTIONS,type LoadingState,type LoadingRole} from "../../../shared/loading/contracts";
import {quantity,quantityText,withinPercent} from "../../../shared/loading/quantity";
import {loadingModuleEnabled} from "./flag";
const ready:TransitionEvidence={creditApproved:true,stockAvailable:true,carrierValid:true,permitValid:true,identityMatches:true,
 safetyPassed:true,capacityAvailable:true,called:true,tareKg:"10000",registeredTareKg:"10000",tareTolerancePercent:"3",
 productMatches:true,batchMatches:true,bayAvailable:true,loadingComplete:true,seal:"TEST-SEAL",grossKg:"30000",orderedKg:"20000",
 recordedKg:"20000",quantityTolerancePercent:"1",grossApproved:true,documentsReady:true,exitVerified:true,passCollected:true};
const steps=[
 ["ASSIGN_CARRIER","customer"],["ISSUE_PERMIT","sales_admin"],["MAIN_GATE_IN","main_gate_officer"],["JOIN_YARD","main_gate_officer"],
 ["CALL","warehouse_manager"],["WAREHOUSE_GATE_IN","warehouse_gate_officer"],["TARE_WEIGH","weighbridge_operator"],["START_LOADING","loading_operator"],
 ["GROSS_WEIGH","weighbridge_operator"],["ISSUE_DOCUMENTS","warehouse_manager"],["WAREHOUSE_GATE_OUT","warehouse_gate_officer"],
 ["MAIN_GATE_OUT","main_gate_officer"],["CLOSE","main_gate_officer"],
] as const;
test("the whole strict workflow closes in order",()=>{
 let state:LoadingState="ORDER_CREATED";for(const [action,role]of steps)state=transitionLoading(state,action,role,ready);assert.equal(state,"CLOSED");
});
for(let i=1;i<steps.length;i++)test(`cannot skip ahead to ${steps[i][0]}`,()=>{
 assert.throws(()=>transitionLoading("ORDER_CREATED",steps[i][0],steps[i][1],ready));
});
test("closed and cancelled loadings never resume or reuse entry",()=>{
 for(const terminal of ["CLOSED","CANCELLED"] as const)for(const [a,r]of steps)assert.throws(()=>transitionLoading(terminal,a,r,ready));
});
test("unprivileged roles cannot issue documents",()=>{
 for(const role of LOADING_ROLES.filter(r=>r!=="loading_manager"&&r!=="warehouse_manager"))
  assert.throws(()=>transitionLoading("GROSS_WEIGH","ISSUE_DOCUMENTS",role,ready));
});
for(const key of ["creditApproved","stockAvailable","carrierValid"] as const)test(`assignment requires ${key}`,()=>{
 assert.throws(()=>transitionLoading("ORDER_CREATED","ASSIGN_CARRIER","customer",{...ready,[key]:false}));
});
for(const key of ["permitValid","identityMatches","safetyPassed","capacityAvailable"] as const)test(`main entry requires ${key}`,()=>{
 assert.throws(()=>transitionLoading("ENTRY_PERMIT_ISSUED","MAIN_GATE_IN","main_gate_officer",{...ready,[key]:false}));
});
test("an uncalled truck cannot enter warehouse",()=>assert.throws(()=>transitionLoading("CALLED","WAREHOUSE_GATE_IN","warehouse_gate_officer",{...ready,called:false})));
test("a tare deviation requires approval AND a reason",()=>{
 const e={...ready,tareKg:"11000"};
 assert.throws(()=>transitionLoading("WAREHOUSE_GATE_IN","TARE_WEIGH","weighbridge_operator",e));
 assert.throws(()=>transitionLoading("WAREHOUSE_GATE_IN","TARE_WEIGH","weighbridge_operator",{...e,supervisorApproved:true}));
 assert.equal(transitionLoading("WAREHOUSE_GATE_IN","TARE_WEIGH","weighbridge_operator",{...e,supervisorApproved:true,reason:"Documented simulated recheck"}),"TARE_WEIGH");
});
for(const key of ["tareKg","productMatches","batchMatches","bayAvailable"] as const)test(`loading requires ${key}`,()=>{
 assert.throws(()=>transitionLoading("TARE_WEIGH","START_LOADING","loading_operator",{...ready,[key]:key==="tareKg"?undefined:false}));
});
test("gross weight must exceed tare; ordered AND counted weights must agree",()=>{
 for(const e of [{grossKg:"9000"},{grossKg:"40000"},{recordedKg:"10000"},{seal:""},{loadingComplete:false}])
  assert.throws(()=>transitionLoading("LOADING","GROSS_WEIGH","weighbridge_operator",{...ready,...e}));
});
test("an approved return allows recovery from a rejected gross reading",()=>{
 assert.throws(()=>transitionLoading("LOADING","RETURN_TO_LOADING","weighbridge_operator",{...ready,supervisorApproved:true,reason:"Recheck"}));
 assert.throws(()=>transitionLoading("LOADING","RETURN_TO_LOADING","warehouse_manager",ready));
 assert.equal(transitionLoading("LOADING","RETURN_TO_LOADING","warehouse_manager",{...ready,supervisorApproved:true,reason:"Correct mismatch"}),"LOADING");
});
for(const key of ["documentsReady","grossApproved","seal","tareKg","grossKg"] as const)test(`document issuance requires ${key}`,()=>{
 assert.throws(()=>transitionLoading("GROSS_WEIGH","ISSUE_DOCUMENTS","warehouse_manager",{...ready,[key]:["seal","tareKg","grossKg"].includes(key)?"":false}));
});
test("warehouse and plant exit require physical verification and card collection",()=>{
 assert.throws(()=>transitionLoading("DOCUMENTS_ISSUED","WAREHOUSE_GATE_OUT","warehouse_gate_officer",{...ready,exitVerified:false}));
 assert.throws(()=>transitionLoading("WAREHOUSE_GATE_OUT","MAIN_GATE_OUT","main_gate_officer",{...ready,passCollected:false}));
});
test("cancellation never erases physical occupancy or deducted stock",()=>{
 const e={reason:"Customer cancellation",insidePlant:false,stockDeducted:false};
 assert.equal(transitionLoading("ORDER_CREATED","CANCEL","loading_manager",e),"CANCELLED");
 for(const b of [{insidePlant:true},{stockDeducted:true},{reason:""}])assert.throws(()=>transitionLoading("LOADING","CANCEL","warehouse_manager",{...e,...b}));
});
test("exact mass calculations preserve eight decimals",()=>{
 assert.equal(quantityText(quantity("9999999999999999999999.99999999")),"9999999999999999999999.99999999");
 assert.equal(quantity("0.1")+quantity("0.2"),quantity("0.3"));
 assert.ok(withinPercent("103","100","3"));assert.ok(!withinPercent("103.00000001","100","3"));
 for(const v of ["NaN","Infinity","-1","1e3","1.000000001","01","1,000"])assert.throws(()=>quantity(v));
});
test("feature flag fails closed in production and for invalid values",()=>{
 assert.equal(loadingModuleEnabled(undefined,"production"),false);assert.equal(loadingModuleEnabled(undefined,"development"),true);
 for(const value of ["false","TRUE","yes","1",""])assert.equal(loadingModuleEnabled(value,"development"),false);
 assert.equal(loadingModuleEnabled("true","production"),true);
});
test("only loading manager receives simulator and every role is scoped",()=>{
 for(const role of LOADING_ROLES.filter(r=>r!=="loading_manager"))assert.ok(!ROLE_SECTIONS[role].includes("simulator"));
 assert.ok(!ROLE_SECTIONS.customer.includes("settings"));assert.equal(new Set(LOADING_STATES).size,LOADING_STATES.length);
});