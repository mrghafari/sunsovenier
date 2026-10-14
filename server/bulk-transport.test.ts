import test from "node:test";
import assert from "node:assert/strict";
import {requiresBulkContractTransport,eligibleTransportTemplates} from "../shared/bulk-transport";
import {assertShippingQuoteBindings,type ShippingQuoteClaims} from "./shipping-quote";
import {insertVehicleTemplateSchema} from "../shared/logistics-schema";

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
test("shared standard tanker supports ordinary and bulk-contract use without category changes",()=>{
  const tanker={id:12,isActive:true,transportCategory:"standard",supportsContract:true,supportsBulk:true};
  assert.deepEqual(eligibleTransportTemplates([tanker],"standard"),[tanker]);
  assert.deepEqual(eligibleTransportTemplates([tanker],"bulk",null,true),[tanker]);
  assert.deepEqual(eligibleTransportTemplates([tanker],"standard",null,true),[tanker]);
  assert.deepEqual(eligibleTransportTemplates([tanker],"bulk",99,true),[]);
  assert.equal(tanker.transportCategory,"standard");
});
test("contract authorization and bulk suitability are independent and fail closed",()=>{
  const templates=[
    {id:1,isActive:true,transportCategory:"standard",supportsContract:true,supportsBulk:false},
    {id:2,isActive:true,transportCategory:"standard",supportsContract:false,supportsBulk:true},
    {id:3,isActive:true,transportCategory:"standard",supportsContract:true,supportsBulk:true},
    {id:4,isActive:false,transportCategory:"standard",supportsContract:true,supportsBulk:true},
    {id:5,isActive:true,transportCategory:"bulk",supportsContract:false,supportsBulk:true},
    {id:6,isActive:true,transportCategory:"bulk",supportsContract:true,supportsBulk:false},
  ];
  assert.deepEqual(eligibleTransportTemplates(templates,"bulk",null,true).map(t=>t.id),[3]);
  assert.deepEqual(eligibleTransportTemplates(templates,"standard",null,true).map(t=>t.id),[1,3]);
  assert.deepEqual(eligibleTransportTemplates(templates,"standard").map(t=>t.id),[1,2,3]);
});
test("capability revocation invalidates previously eligible contract templates",()=>{
  const tanker={id:12,isActive:true,transportCategory:"standard",supportsContract:true,supportsBulk:true};
  assert.equal(eligibleTransportTemplates([tanker],"bulk",12,true).length,1);
  for(const revoked of [
    {...tanker,supportsContract:false},{...tanker,supportsBulk:false},{...tanker,isActive:false},
  ])assert.equal(eligibleTransportTemplates([revoked],"bulk",12,true).length,0);
  // A legacy category must never override an explicit opt-out.
  assert.equal(eligibleTransportTemplates([{...tanker,transportCategory:"bulk",supportsBulk:false}],"bulk",12,true).length,0);
});
test("legacy bulk templates retain compatibility but unmarked standard templates cannot serve contracts",()=>{
  const templates=[{id:1,isActive:true,transportCategory:"bulk"},{id:2,isActive:true,transportCategory:"standard"}];
  assert.deepEqual(eligibleTransportTemplates(templates,"bulk",null,true).map(t=>t.id),[1]);
  assert.deepEqual(eligibleTransportTemplates(templates,"standard",null,true),[]);
});
test("template creation validates true and false capability values without string coercion",()=>{
  const input={name:"Synthetic tanker",vehicleType:"heavy_truck",maxWeightKg:"23000",
    allowedRoutes:["urban","interurban","highway"],basePrice:"350000",pricePerKm:"1000",
    supportsContract:true,supportsBulk:true};
  assert.equal(insertVehicleTemplateSchema.parse(input).supportsContract,true);
  assert.equal(insertVehicleTemplateSchema.parse({...input,supportsBulk:false}).supportsBulk,false);
  assert.equal(insertVehicleTemplateSchema.safeParse({...input,supportsContract:"false"}).success,false);
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
