import test from "node:test";
import assert from "node:assert/strict";
import {requiresBulkContractTransport,eligibleTransportTemplates} from "../shared/bulk-transport";
import {assertShippingQuoteBindings,type ShippingQuoteClaims} from "./shipping-quote";

test("bulk transport requires a contract and a flagged product; ordinary products remain standard",()=>{
  for(const id of [null,undefined,0,-1,"invalid",Infinity])assert.equal(requiresBulkContractTransport(id,[{isBulkSale:true}]),false);
  assert.equal(requiresBulkContractTransport(12,[{isBulkSale:true}]),true);
  assert.equal(requiresBulkContractTransport(12,[{isBulkSale:false}]),false);
  assert.equal(requiresBulkContractTransport(12,[{isBulkSale:false},{isBulkSale:true}]),true);
});
test("only active templates of the required category and selected ID are eligible",()=>{
  const templates=[
    {id:1,isActive:true,transportCategory:"standard"},
    {id:2,isActive:true,transportCategory:"bulk"},
    {id:3,isActive:false,transportCategory:"bulk"},
    {id:4,isActive:true,transportCategory:"bulk"},
  ];
  assert.deepEqual(eligibleTransportTemplates(templates,"bulk").map(t=>t.id),[2,4]);
  assert.deepEqual(eligibleTransportTemplates(templates,"bulk",4).map(t=>t.id),[4]);
  for(const id of [1,3,99])assert.deepEqual(eligibleTransportTemplates(templates,"bulk",id),[]);
  assert.deepEqual(eligibleTransportTemplates(templates,"standard").map(t=>t.id),[1]);
});
test("quote bindings include contract identity and the authoritative product bulk flag",()=>{
  const expected={center:{cityId:1,countryCode:"IQ"},destinationCityId:2,distanceKm:100,
    cart:[{id:3,quantity:2,weightKg:1000,isFlammable:false,isHazardous:false,isBulkSale:true}],
    totalWeightKg:2000,isFlammable:false,isHazardous:false,method:"vehicle_quote" as const,contractId:12};
  const claims:ShippingQuoteClaims={...expected,version:1,issuedAt:0,expiresAt:99999,
    selectedVehicles:[{id:2,name:"Bulk truck",type:"heavy_truck",transportCategory:"bulk"}],shippingCost:100};
  assert.doesNotThrow(()=>assertShippingQuoteBindings(claims,expected));
  assert.throws(()=>assertShippingQuoteBindings(claims,{...expected,contractId:13}));
  assert.throws(()=>assertShippingQuoteBindings(claims,{...expected,contractId:null}));
  assert.throws(()=>assertShippingQuoteBindings(claims,{...expected,cart:expected.cart.map(row=>({...row,isBulkSale:false}))}));
});
