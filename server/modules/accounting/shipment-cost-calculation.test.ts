import test from "node:test";
import assert from "node:assert/strict";
import {calculateShipmentCost} from "./shipment-cost-calculation";
import {shipmentCostCommandSchema,shipmentCostFiltersSchema} from "@shared/accounting-shipment-costs";
const order={version:1,companyId:1,orderId:22,shippingMode:"SELLER_ARRANGED"};
const loading={order,input:{eventType:"LoadingCompleted",orderId:22,sourceId:"truck-A",
  eventDate:"2026-06-01",weighbridgeReference:"verified-ticket",actualWeightTons:"24.350",lines:[{orderItemId:1,actualWeightTons:"24.350"}]}};
const external={order,input:{eventType:"ShipmentCostRecorded",orderId:22,sourceId:"cost-A",loadingSourceId:"truck-A",
  eventDate:"2026-06-02",costType:"EXTERNAL_CARRIER",carrierReference:"carrier-7",
  actualCost:"100.25",currency:"USD",costDocumentReference:"vendor-doc"}};
const fleet={order,input:{...external.input,costType:"INTERNAL_FLEET",distanceKm:"83.25"},
  fleet:{rate:"10.5",basis:"per_ton",costCenterId:2,currency:"IQD"}};
test("documented external costs preserve currency precision and do not infer a rate or carrier ID",()=>{
  const result=calculateShipmentCost(external,loading,"IQD",2);
  assert.equal(result.amount,"100.25");assert.equal(result.currency,"USD");assert.equal(result.fleetRate,null);
  assert.throws(()=>calculateShipmentCost(external,loading,"IQD",0),/precision/);
  assert.throws(()=>calculateShipmentCost({...external,input:{...external.input,actualCost:100.25}},loading,"IQD",2));
  assert.throws(()=>calculateShipmentCost({...external,input:{...external.input,costDocumentReference:""}},loading,"IQD",2));
});
test("internal cost uses frozen measured tons or distance with one final currency rounding",()=>{
  assert.equal(calculateShipmentCost(fleet,loading,"IQD",0).amount,"256");
  const km={...fleet,fleet:{...fleet.fleet,basis:"per_km",rate:"12.34"}};
  assert.equal(calculateShipmentCost(km,loading,"IQD",2).amount,"1027.31");
  assert.throws(()=>calculateShipmentCost({...km,input:{...km.input,distanceKm:undefined}},loading,"IQD",2));
  assert.throws(()=>calculateShipmentCost({...fleet,fleet:{...fleet.fleet,basis:"per_vehicle"}},loading,"IQD",0));
  assert.throws(()=>calculateShipmentCost({...fleet,fleet:{...fleet.fleet,currency:"USD"}},loading,"IQD",0));
  assert.throws(()=>calculateShipmentCost({...fleet,fleet:{...fleet.fleet,rate:"0.001"}},loading,"IQD",0));
});
test("unknown or mismatched immutable identities, dates and weights stay blocked",()=>{
  for(const input of [
    {...external.input,eventDate:"2026-02-31"},{...external.input,eventDate:"2026-05-31"},
    {...external.input,orderId:23},{...external.input,loadingSourceId:"another-truck"},
  ])assert.throws(()=>calculateShipmentCost({...external,input},loading,"IQD",2));
  for(const altered of [
    {...loading,order:{...order,version:0}},
    {...loading,order:{...order,companyId:2}},
    {...loading,order:{...order,shippingMode:"CUSTOMER_ARRANGED"}},
    {...loading,input:{...loading.input,actualWeightTons:"24"}},
    {...loading,input:{...loading.input,lines:[]}},
  ])assert.throws(()=>calculateShipmentCost(external,altered,"IQD",2));
});
test("large money stays exact; commands and queries reject undeclared activation fields",()=>{
  const result=calculateShipmentCost({...external,input:{...external.input,actualCost:"9007199254740993.25"}},loading,"IQD",2);
  assert.equal(result.amount,"9007199254740993.25");
  const command={companyId:1,factId:2,expectedPlanHash:"a".repeat(64),reason:"Reviewed actual expense"};
  assert.equal(shipmentCostCommandSchema.parse(command).carrierPartyId,null);
  assert.equal(shipmentCostCommandSchema.safeParse({...command,processingReady:true}).success,false);
  assert.equal(shipmentCostCommandSchema.safeParse({...command,carrierPartyId:0}).success,false);
  assert.equal(shipmentCostFiltersSchema.safeParse({companyId:1,pageSize:101}).success,false);
});
