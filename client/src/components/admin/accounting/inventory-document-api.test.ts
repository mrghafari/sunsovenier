import { test } from "node:test";
import assert from "node:assert/strict";
import type { InventoryDocumentInput, InventoryDocumentRow } from "@shared/accounting-inventory-documents";
import { saveInventoryDocumentRequest } from "./accounting-inventory-api";

const savedRow:InventoryDocumentRow={
  id:17,companyId:6,sourceId:"inventory-uuid-once",revision:2,kind:"purchase",reference:"INV-REAL-17",documentDate:"2025-02-11",
  supplier:"Harbor Minerals",currency:"IQD",evidenceReference:"Paper cabinet 3 / folder 8",notes:"",
  lines:[{productId:12,productName:"Crushed limestone",productSku:"LIM-12",batchReference:"BATCH-17-A",quantityTons:"12.375",totalCost:"15300.500"}],
  totalCost:"15300.500",totalTons:"12.375",status:"draft",approval:null,closure:null,postingAllowed:false,stockChanged:false,valuationStatus:"documentary_only",
};
const createInput:InventoryDocumentInput={
  companyId:6,sourceId:savedRow.sourceId,kind:"purchase",reference:savedRow.reference,documentDate:savedRow.documentDate,
  supplier:savedRow.supplier,currency:savedRow.currency,evidenceReference:savedRow.evidenceReference,notes:"",
  lines:[{productId:12,batchReference:"BATCH-17-A",quantityTons:"12.375",totalCost:"15300.500"}],
};

test("the actual save-hook request boundary POSTs create and edit to the single collection URL with exact bodies",async()=>{
  const originalFetch=globalThis.fetch;
  const calls:{url:string;init?:RequestInit}[]=[];
  let failOnce=true;
  globalThis.fetch=(async(input,init)=>{
    calls.push({url:String(input),init});
    if(failOnce){
      failOnce=false;
      return {ok:false,status:409,json:async()=>({code:"STALE_DOCUMENT",message:"STALE_DOCUMENT"})} as Response;
    }
    return {ok:true,status:200,json:async()=>savedRow} as Response;
  }) as typeof fetch;
  try{
    await assert.rejects(saveInventoryDocumentRequest(createInput),error=>Boolean(error&&typeof error==="object"&&"code" in error&&(error as {code?:string}).code==="STALE_DOCUMENT"));
    const created=await saveInventoryDocumentRequest(createInput);
    const editInput:InventoryDocumentInput={...createInput,id:created.id,revision:created.revision,notes:"Retained manager note"};
    await saveInventoryDocumentRequest(editInput);

    assert.deepEqual(calls.map(call=>call.url),[
      "/api/accounting/v2/inventory-documents",
      "/api/accounting/v2/inventory-documents",
      "/api/accounting/v2/inventory-documents",
    ]);
    assert.deepEqual(calls.map(call=>call.init?.method),["POST","POST","POST"]);
    assert.equal(calls[0].init?.credentials,"include");
    assert.deepEqual(JSON.parse(String(calls[1].init?.body)),createInput);
    assert.deepEqual(JSON.parse(String(calls[2].init?.body)),editInput);
    assert.equal(JSON.parse(String(calls[1].init?.body)).sourceId,JSON.parse(String(calls[2].init?.body)).sourceId);
    assert.equal(JSON.parse(String(calls[2].init?.body)).revision,created.revision);
  }finally{globalThis.fetch=originalFetch;}
});
