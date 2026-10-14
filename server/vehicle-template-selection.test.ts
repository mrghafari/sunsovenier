import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
import {eligibleTransportTemplates,requiresBulkContractTransport} from "../shared/bulk-transport";
import {ShippingConfigurationError} from "./shipping-center-service";

// Exercise the real route callback in isolation; no application login bypass,
// database writes, fabricated session cookies or real customer data.
const source=readFileSync(new URL("./routes.ts",import.meta.url),"utf8");
const ast=ts.createSourceFile("routes.ts",source,ts.ScriptTarget.Latest,true);
let callback:ts.Node|undefined;
function visit(node:ts.Node){
  if(ts.isCallExpression(node)&&node.expression.getText(ast)==="app.post"&&
    node.arguments[0]?.getText(ast)==='"/api/logistics/select-optimal-vehicle"'){
    callback=node.arguments[node.arguments.length-1];
  }
  ts.forEachChild(node,visit);
}
visit(ast);
assert(callback,"Smart vehicle handler must exist");
const callbackCode=ts.transpileModule(`const handler=${callback.getText(ast).replace(
  'await import("./shop-contracts")',"await Promise.resolve(contractModule)",
)}; return handler;`,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;

const tanker={id:12,name:"Synthetic shared tanker",vehicleType:"heavy_truck",transportCategory:"standard",
  supportsContract:true,supportsBulk:true,isActive:true,maxWeightKg:"23000",maxVolumeM3:"30",
  allowedRoutes:["urban","interurban","highway"],supportsHazardous:true,supportsFlammable:true,
  basePrice:"350000",pricePerKm:"1000",priority:0,averageSpeedKmh:"50"};
async function select(templates:unknown[],options:{contract?:boolean;flammable?:boolean;packaging?:string}={}){
  let quoteIssued=false;
  const dependencies={
    getCanonicalCheckoutCartFacts:async()=>({cart:[{id:635,quantity:1,weightKg:1100,isBulkSale:true}],
      totalWeightKg:1100,isFlammable:options.flammable??false,isHazardous:false}),
    contractModule:{loadContractPricing:async()=>({packaging:{type:options.packaging??"bulk"},shippingMode:"automatic_vehicle"}),
      assertContractShippingMode:()=>{}},
    requiresBulkContractTransport,eligibleTransportTemplates,ShippingConfigurationError,
    resolveShippingRoute:async()=>({distanceKm:50,destinationCityId:2}),
    getShippingCenter:async()=>({cityId:1,countryCode:"IQ"}),
    issueCheckoutShippingQuote:async()=>{quoteIssued=true;return "synthetic-quote";},
    db:{select:()=>({from:()=>({where:()=>({orderBy:async()=>templates})})}),insert:()=>({values:async()=>[]})},
    eq:()=>null,vehicleTemplates:{isActive:"isActive",priority:"priority"},vehicleSelectionHistory:{},
    console:{log:()=>{},error:()=>{}},
    findOptimalVehicleCombination:()=>{throw new Error("Single-load fixture must not request multiple vehicles");},
  };
  const handler=new Function(...Object.keys(dependencies),callbackCode)(...Object.values(dependencies));
  let status=200,body:any;
  const res={status:(code:number)=>{status=code;return res;},json:(data:unknown)=>{body=data;return res;}};
  await handler({body:{cart:{"635":1},checkout:true,destinationCityId:2,...(options.contract===false?{}:{contractId:7})},
    session:{crmCustomerId:999}},res);
  return {status,body,quoteIssued};
}
test("real smart selector quotes the standard-category shared tanker for a bulk contract",async()=>{
  const result=await select([tanker]);
  assert.equal(result.status,200);assert.equal(result.body.success,true);
  assert.equal(result.body.selectedVehicle.id,12);assert.equal(result.quoteIssued,true);
});
test("real smart selector keeps that same tanker available to ordinary checkout",async()=>{
  const result=await select([tanker],{contract:false});
  assert.equal(result.status,200);assert.equal(result.body.selectedVehicle.id,12);
});
test("real smart selector rejects contract permission, bulk capability, activity and safety opt-outs",async()=>{
  for(const template of [
    {...tanker,supportsContract:false},{...tanker,supportsBulk:false},{...tanker,isActive:false},
    {...tanker,supportsFlammable:false},{...tanker,notAllowedFlammable:true},
  ]){
    const result=await select([template],{flammable:true});
    assert.equal(result.body.success,false);assert.equal(result.quoteIssued,false);
  }
});
test("real smart selector requires contract permission even for nonbulk contract goods",async()=>{
  const result=await select([{...tanker,supportsContract:false}],{packaging:"bag"});
  assert.equal(result.body.success,false);assert.equal(result.quoteIssued,false);
});
