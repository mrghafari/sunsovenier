import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { InventoryDocumentRow } from "@shared/accounting-inventory-documents";
import { InventoryDocumentActions, InventoryDocumentDetailView, InventoryEmptyState, InventoryProvenance, InventoryReadOnlyNotice, InventorySafetyNotice, InventoryStatus } from "./accounting-inventory-documents";
import { inventoryCopy, inventoryLanguageKeys } from "./inventory-document-copy";

const row:InventoryDocumentRow={
  id:41,companyId:8,sourceId:"inventory-source-test-41",revision:4,kind:"purchase",reference:"PAPER-INV-41",
  documentDate:"2025-03-17",supplier:"North Quay Minerals",currency:"IQD",evidenceReference:"Archive shelf B-14",
  notes:"Original paper invoice retained in archive.",lines:[{productId:9,productName:"Washed limestone",productSku:"LIM-08",batchReference:"LOT-25-031",quantityTons:"18.375",totalCost:"12750.500"}],
  totalCost:"12750.500",totalTons:"18.375",status:"draft",approval:null,closure:null,postingAllowed:false,stockChanged:false,valuationStatus:"documentary_only",
};

test("the production empty, viewer, and safety notices are localized across all four languages",()=>{
  for(const language of inventoryLanguageKeys){
    const empty=renderToStaticMarkup(createElement(InventoryEmptyState,{language}));
    const viewer=renderToStaticMarkup(createElement(InventoryReadOnlyNotice,{language}));
    const safety=renderToStaticMarkup(createElement(InventorySafetyNotice,{language}));
    assert.ok(empty.includes(inventoryCopy[language].emptyTitle));
    assert.ok(empty.includes(inventoryCopy[language].empty));
    assert.ok(viewer.includes(inventoryCopy[language].readOnly));
    assert.ok(viewer.includes(inventoryCopy[language].readOnlyHelp));
    assert.ok(safety.includes(inventoryCopy[language].postingBlocked));
    assert.ok(safety.includes(inventoryCopy[language].notStock));
    assert.ok(safety.includes(inventoryCopy[language].safetyBody));
    assert.match(safety,/Kardex|کاردکس|كاردكس/);
  }
});

test("actual inventory statuses and provenance retain documentary evidence and lifecycle history in every locale",()=>{
  for(const language of inventoryLanguageKeys){
    const status=renderToStaticMarkup(createElement(InventoryStatus,{status:"draft",language}));
    const approved=renderToStaticMarkup(createElement(InventoryStatus,{status:"approved",language}));
    const discarded=renderToStaticMarkup(createElement(InventoryStatus,{status:"discarded",language}));
    const voided=renderToStaticMarkup(createElement(InventoryStatus,{status:"voided",language}));
    const provenance=renderToStaticMarkup(createElement(InventoryProvenance,{row:{...row,status:"voided",approval:{actorId:"staff-7",actorType:"manager",at:"2025-03-18T10:00:00Z",reason:"Evidence checked against signed copy"},closure:{actorId:"staff-7",actorType:"manager",at:"2025-03-19T11:00:00Z",reason:"Duplicate invoice reference corrected"}},language}));
    assert.ok(status.includes(inventoryCopy[language].status_draft));
    assert.ok(approved.includes(inventoryCopy[language].status_approved));
    assert.ok(discarded.includes(inventoryCopy[language].status_discarded));
    assert.ok(voided.includes(inventoryCopy[language].status_voided));
    assert.ok(provenance.includes(row.sourceId));
    assert.ok(provenance.includes("Evidence checked against signed copy"));
    assert.ok(provenance.includes("Duplicate invoice reference corrected"));
    assert.ok(provenance.includes(inventoryCopy[language].approval));
    assert.ok(provenance.includes(inventoryCopy[language].closure));
  }
});

test("document actions are permission-gated and follow draft and approved statuses",()=>{
  const noop=()=>undefined;
  for(const language of inventoryLanguageKeys){
    const viewer=renderToStaticMarkup(createElement(InventoryDocumentActions,{row,language,canManage:false,busy:false,onEdit:noop,onApprove:noop,onDiscard:noop,onVoid:noop}));
    assert.equal(viewer,"");
    const draftManager=renderToStaticMarkup(createElement(InventoryDocumentActions,{row,language,canManage:true,busy:false,onEdit:noop,onApprove:noop,onDiscard:noop,onVoid:noop}));
    assert.ok(draftManager.includes(inventoryCopy[language].edit));
    assert.ok(draftManager.includes(inventoryCopy[language].approve));
    assert.ok(draftManager.includes(inventoryCopy[language].discard));
    assert.ok(!draftManager.includes(inventoryCopy[language].void));
    const approvedManager=renderToStaticMarkup(createElement(InventoryDocumentActions,{row:{...row,status:"approved"},language,canManage:true,busy:false,onEdit:noop,onApprove:noop,onDiscard:noop,onVoid:noop}));
    assert.ok(approvedManager.includes(inventoryCopy[language].void));
    assert.ok(!approvedManager.includes(inventoryCopy[language].edit));
  }
});

test("document detail remains readable to viewers while every write control stays manager-only",()=>{
  const noop=()=>undefined;
  for(const language of inventoryLanguageKeys){
    const common={row,language,busy:false,actionError:"",stale:false,onReload:noop,onEdit:noop,onApprove:noop,onDiscard:noop,onVoid:noop};
    const viewer=renderToStaticMarkup(createElement(InventoryDocumentDetailView,{...common,canManage:false}));
    const manager=renderToStaticMarkup(createElement(InventoryDocumentDetailView,{...common,canManage:true}));
    assert.ok(viewer.includes(row.reference));
    assert.ok(viewer.includes(row.evidenceReference));
    assert.ok(viewer.includes(row.totalCost));
    assert.ok(viewer.includes(row.sourceId));
    assert.ok(!viewer.includes("inventory-document-actions"));
    assert.ok(manager.includes("inventory-document-actions"));
    assert.ok(manager.includes(inventoryCopy[language].approve));
  }
});
