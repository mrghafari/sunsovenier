import {and,eq} from "drizzle-orm";
import {db} from "./db";
import {vehicleTemplates} from "../shared/logistics-schema";
import {requiresBulkContractTransport} from "../shared/bulk-transport";
import {ShippingConfigurationError} from "./shipping-center-service";

export async function validateSelectedBulkTemplate(input:{
  contractId:unknown;products:{isBulkSale?:boolean|null;isFlammable?:boolean|null;shippingClass?:string|null}[];
  selectedTemplateId:unknown;quotedVehicles?:{id:number|string}[];
}):Promise<number|null>{
  if(input.selectedTemplateId==null)return null;
  const id=Number(input.selectedTemplateId);
  if(!Number.isSafeInteger(id)||id<=0||!requiresBulkContractTransport(input.contractId,input.products))
    throw new ShippingConfigurationError("Invalid bulk vehicle selection.",422);
  const [template]=await db.select().from(vehicleTemplates).where(and(
    eq(vehicleTemplates.id,id),eq(vehicleTemplates.isActive,true),eq(vehicleTemplates.transportCategory,"bulk")));
  if(!template)throw new ShippingConfigurationError("The selected bulk vehicle is unavailable.",422);
  const flammable=input.products.some(p=>p.isFlammable===true||String(p.shippingClass??"").toLowerCase()==="flammable");
  const hazardous=input.products.some(p=>String(p.shippingClass??"").toLowerCase()==="hazardous"&&p.isFlammable!==true);
  if((flammable&&(template.supportsFlammable!==true||template.notAllowedFlammable===true))||
    (hazardous&&template.supportsHazardous!==true))
    throw new ShippingConfigurationError("The selected bulk vehicle cannot carry these goods.",422);
  if(input.quotedVehicles?.some(v=>Number(v.id)!==id))
    throw new ShippingConfigurationError("The vehicle choice changed after the shipping quote. Recalculate shipping.",422);
  return id;
}
