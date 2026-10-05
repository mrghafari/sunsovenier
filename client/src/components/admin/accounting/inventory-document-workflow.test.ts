import { test } from "node:test";
import assert from "node:assert/strict";
import type { InventoryDocumentMetadata, InventoryDocumentRow } from "@shared/accounting-inventory-documents";
import { confirmInventoryDocumentAction, createInventorySourceId, inventoryActionAllowed, inventoryDraftFromRow, inventoryDraftInput, reloadInventoryStaleRecord, scopedInventoryDocument, validateInventoryActionConfirmation, validateInventoryDraft, type InventoryDraft } from "./inventory-document-workflow";

const metadata:InventoryDocumentMetadata={
  companyId:6,currencies:[{code:"IQD",decimals:3}],products:[{id:12,name:"Crushed limestone",sku:"LIM-12"}],
  postingAllowed:false,stockChanged:false,valuationStatus:"documentary_only",
};
const draft:InventoryDraft={
  kind:"purchase",reference:"INV-REAL-17",documentDate:"2025-02-11",supplier:"Harbor Minerals",currency:"IQD",
  evidenceReference:"Paper cabinet 3 / folder 8",notes:"",sourceId:"inventory-uuid-once",
  lines:[{productId:"12",batchReference:"BATCH-17-A",quantityTons:"۱۲٫۳۷۵",totalCost:"۱۵۳۰۰٫۵۰۰"}],
};
const row:InventoryDocumentRow={
  id:17,companyId:6,sourceId:"inventory-uuid-once",revision:2,kind:"purchase",reference:"INV-REAL-17",documentDate:"2025-02-11",
  supplier:"Harbor Minerals",currency:"IQD",evidenceReference:"Paper cabinet 3 / folder 8",notes:"",
  lines:[{productId:12,productName:"Crushed limestone",productSku:"LIM-12",batchReference:"BATCH-17-A",quantityTons:"12.375",totalCost:"15300.500"}],
  totalCost:"15300.500",totalTons:"12.375",status:"draft",approval:null,closure:null,postingAllowed:false,stockChanged:false,valuationStatus:"documentary_only",
};

test("draft validation accepts documented decimal strings and flags invalid lines, duplicate batches, dates, and purchase suppliers",()=>{
  assert.deepEqual(validateInventoryDraft(draft,6,metadata),{valid:true,fieldErrors:[],lineErrors:{}});
  const payload=inventoryDraftInput(draft,6);
  assert.equal(payload.lines[0].quantityTons,"12.375");
  assert.equal(payload.lines[0].totalCost,"15300.500");
  assert.deepEqual(validateInventoryDraft({...draft,kind:"opening",supplier:""},6,metadata).valid,true);
  const invalidLine={...draft,lines:[{...draft.lines[0],quantityTons:"0",totalCost:"1.0000"}]};
  assert.deepEqual(validateInventoryDraft(invalidLine,6,metadata).lineErrors,{0:"line"});
  const duplicate={...draft,lines:[...draft.lines,draft.lines[0]]};
  assert.deepEqual(validateInventoryDraft(duplicate,6,metadata).lineErrors,{1:"line"});
  assert.ok(validateInventoryDraft({...draft,documentDate:"2025-02-30"},6,metadata).fieldErrors.includes("documentDate"));
  assert.ok(validateInventoryDraft({...draft,supplier:" "},6,metadata).fieldErrors.includes("supplier"));
});

test("source IDs are minted once for a draft and failures retain that same identifier for retry",()=>{
  let calls=0;
  const sourceId=createInventorySourceId(()=>{calls++;return "fixed-uuid";});
  const newDraft={...draft,sourceId};
  const firstAttempt=inventoryDraftInput(newDraft,6);
  const afterFailedSave=inventoryDraftInput(newDraft,6);
  assert.equal(calls,1);
  assert.equal(firstAttempt.sourceId,"inventory-fixed-uuid");
  assert.equal(afterFailedSave.sourceId,firstAttempt.sourceId);
});

test("approval, discard, and void require a staff-entered 5-500 character reason; approval also requires attestation",()=>{
  for(const action of ["approve","discard","void"] as const){
    assert.deepEqual(validateInventoryActionConfirmation(action,"  ",false),{valid:false,error:"reason"});
    assert.deepEqual(validateInventoryActionConfirmation(action,"x".repeat(501),true),{valid:false,error:"reason"});
    const accepted=validateInventoryActionConfirmation(action,"  Matched signed paper invoice  ",action!=="approve");
    if(action==="approve")assert.deepEqual(accepted,{valid:false,error:"attestation"});
    else assert.deepEqual(accepted,{valid:true,reason:"Matched signed paper invoice"});
  }
  assert.deepEqual(validateInventoryActionConfirmation("approve","Staff verified archive reference",true),{valid:true,reason:"Staff verified archive reference"});
});

test("the production confirmation lifecycle blocks incomplete attestations and sends the exact staff reason with current revision",async()=>{
  const sent:{id:number;action:string;companyId:number;revision:number;reason:string}[]=[];
  const pending={action:"approve" as const,row};
  const submit=async(input:typeof sent[number])=>{sent.push(input);};
  const empty=await confirmInventoryDocumentAction({canManage:true,companyId:6,pending,reason:"",attested:true,submit});
  assert.deepEqual(empty,{submitted:false,error:"reason"});
  const unattested=await confirmInventoryDocumentAction({canManage:true,companyId:6,pending,reason:"Checked signed invoice",attested:false,submit});
  assert.deepEqual(unattested,{submitted:false,error:"attestation"});
  const viewer=await confirmInventoryDocumentAction({canManage:false,companyId:6,pending,reason:"Checked signed invoice",attested:true,submit});
  assert.deepEqual(viewer,{submitted:false,error:"permission"});
  const confirmed=await confirmInventoryDocumentAction({canManage:true,companyId:6,pending,reason:"  Checked signed invoice  ",attested:true,submit});
  assert.deepEqual(confirmed,{submitted:true});
  assert.deepEqual(sent,[{id:17,action:"approve",companyId:6,revision:2,reason:"Checked signed invoice"}]);
});

test("stale reload fetches latest revision, refreshes draft/action state, and closes actions made obsolete by a status change",async()=>{
  let listRefreshes=0;
  const approvedRow={...row,revision:3,status:"approved" as const,approval:{actorId:"staff-6",actorType:"manager",at:"2025-02-12T08:00:00Z",reason:"Archive copy inspected"}};
  const staleAction={action:"approve" as const,row};
  const loaded=await reloadInventoryStaleRecord({
    selectedId:row.id,companyId:row.companyId,formOpen:true,pendingAction:staleAction,
    refetchDetail:async()=>({data:approvedRow}),refetchList:async()=>{listRefreshes++;},
  });
  assert.equal(listRefreshes,1);
  assert.equal(loaded.resolved,true);
  assert.equal(loaded.row?.revision,3);
  assert.equal(loaded.closeForm,true);
  assert.equal(loaded.draft,undefined);
  assert.equal(loaded.pendingAction,null);

  const latestDraft={...row,revision:5};
  const retry=await reloadInventoryStaleRecord({
    selectedId:row.id,companyId:row.companyId,formOpen:true,pendingAction:{action:"approve",row},
    refetchDetail:async()=>({data:latestDraft}),refetchList:async()=>{listRefreshes++;},
  });
  assert.equal(retry.resolved,true);
  assert.equal(retry.draft?.revision,5);
  assert.equal(retry.draft?.sourceId,row.sourceId);
  assert.equal(retry.pendingAction?.row.revision,5);

  const failedReload=await reloadInventoryStaleRecord({
    selectedId:row.id,companyId:row.companyId,formOpen:true,pendingAction:staleAction,
    refetchDetail:async()=>({data:undefined}),refetchList:async()=>{listRefreshes++;},
  });
  assert.equal(failedReload.resolved,false);
  assert.equal(failedReload.draft,undefined);
  assert.equal(failedReload.pendingAction,staleAction);
});

test("detail is scoped to the active company and mutating capabilities require manager role plus valid status",()=>{
  assert.equal(scopedInventoryDocument(row,6,row.id),row);
  assert.equal(scopedInventoryDocument(row,7,row.id),undefined);
  assert.equal(scopedInventoryDocument(row,6,99),undefined);
  assert.equal(inventoryActionAllowed(false,row,6,"edit"),false);
  assert.equal(inventoryActionAllowed(true,row,7,"approve"),false);
  assert.equal(inventoryActionAllowed(true,row,6,"edit"),true);
  assert.equal(inventoryActionAllowed(true,row,6,"approve"),true);
  assert.equal(inventoryActionAllowed(true,row,6,"void"),false);
  assert.equal(inventoryActionAllowed(true,{...row,status:"approved"},6,"void"),true);
  assert.equal(inventoryDraftFromRow(row).revision,row.revision);
});
