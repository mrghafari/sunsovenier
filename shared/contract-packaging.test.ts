import assert from "node:assert/strict";
import {test} from "node:test";
import {calculateContractPackaging, parseContractPackaging, packagingTypeLabel, packagingTermsText, packagingTypes} from "./contract-packaging";
import {requiresBulkContractTransport} from "./bulk-transport";

const packaging = {type:"drum",customName:"",costPerTonne:12000,vatRatePercent:9.25};
const items = [{productId:2,quantity:3,netWeight:250,weightUnit:"kg"}, {productId:1,quantity:1,netWeight:0.5,weightUnit:"tonne"}];
test("net tonnes, per-tonne fee, separate VAT, and stable item order",()=>{
  const quote=calculateContractPackaging(packaging,items)!;
  assert.equal(quote.netWeightKg,1250); assert.equal(quote.netTonnes,1.25);
  assert.equal(quote.costAmount,15000); assert.equal(quote.vatAmount,1388); assert.equal(quote.totalAmount,16388);
  assert.deepEqual(quote.items.map(x=>x.productId),[1,2]);
  assert.deepEqual(quote,calculateContractPackaging(packaging,[...items].reverse()));
});
test("rounds fee before calculating independently rounded IQD VAT",()=>{
  const quote=calculateContractPackaging({...packaging,costPerTonne:3,vatRatePercent:50},[{productId:1,quantity:1,netWeight:500}])!;
  assert.equal(quote.costAmount,2); assert.equal(quote.vatAmount,1); assert.equal(quote.totalAmount,3);
});
for(const [weightUnit,netWeight] of [["kg",1000],["g",1000000],["ton",1],["t",1]] as const)
  test(`net unit conversion ${weightUnit}`,()=>assert.equal(calculateContractPackaging(packaging,[{productId:1,quantity:1,netWeight,weightUnit}])?.costAmount,12000));
for(const netWeight of [null,undefined,"",0,-1,"not a weight"])
  test(`paid packaging rejects missing/invalid net weight ${String(netWeight)}`,()=>assert.throws(()=>calculateContractPackaging(packaging,[{productId:1,quantity:1,netWeight,...{grossWeight:1000,weight:1000}}]),/وزن خالص/));
test("unknown units cannot substitute for verified net weight",()=>assert.throws(()=>calculateContractPackaging(packaging,[{productId:1,quantity:1,netWeight:1000,weightUnit:"litre"}]),/وزن خالص/));
test("legacy contracts keep no packaging charges",()=>{
  assert.equal(parseContractPackaging(null),null); assert.equal(calculateContractPackaging(undefined,items),null);
});
test("explicit zero cost keeps type without inventing missing weights",()=>{
  const quote=calculateContractPackaging({...packaging,costPerTonne:0},[{productId:1,quantity:1,netWeight:null}])!;
  assert.equal(quote.netWeightKg,null); assert.equal(quote.totalAmount,0); assert.equal(quote.type,"drum");
});
for(const type of packagingTypes) test(`supports ${type}`,()=>assert.equal(parseContractPackaging({...packaging,type,customName:"Reusable crate"})?.type,type));
for(const costPerTonne of [-1,1.2,"",null,[],false,Infinity])
  test(`rejects invalid cost ${String(costPerTonne)}`,()=>assert.throws(()=>parseContractPackaging({...packaging,costPerTonne})));
for(const vatRatePercent of [-1,101,9.255,"",null,[],false,Infinity])
  test(`rejects invalid VAT ${String(vatRatePercent)}`,()=>assert.throws(()=>parseContractPackaging({...packaging,vatRatePercent})));
test("custom type requires a name and is trimmed",()=>{
  assert.throws(()=>parseContractPackaging({...packaging,type:"other"}));
  assert.equal(parseContractPackaging({...packaging,type:"other",customName:" crate "})?.customName,"crate");
});
for(const language of ["fa","ar","tr","en"])test(`contract packaging terms and labels in ${language}`,()=>{
  const p=parseContractPackaging(packaging)!;
  assert.ok(packagingTypeLabel(p,language)); assert.ok(packagingTermsText(p,language).includes("IQD"));
});
test("explicit contract packaging overrides legacy product bulk flag only for transport",()=>{
  assert.equal(requiresBulkContractTransport(1,[{isBulkSale:true}],"drum"),false);
  assert.equal(requiresBulkContractTransport(1,[{isBulkSale:false}],"bulk"),true);
  assert.equal(requiresBulkContractTransport(1,[{isBulkSale:true}]),true);
  assert.equal(requiresBulkContractTransport(null,[{isBulkSale:true}],"bulk"),false);
});
test("invalid cart quantity and unsafe amounts fail",()=>{
  assert.throws(()=>calculateContractPackaging(packaging,[{productId:1,quantity:1.5,netWeight:1000}]));
  assert.throws(()=>calculateContractPackaging({...packaging,costPerTonne:Number.MAX_SAFE_INTEGER},[{productId:1,quantity:2,netWeight:1000}]));
});
