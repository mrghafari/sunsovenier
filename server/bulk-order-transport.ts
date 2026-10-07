import {ShippingConfigurationError} from "./shipping-center-service";

export async function validateSelectedBulkTemplate(input:{
  contractId:unknown;products:{isBulkSale?:boolean|null;isFlammable?:boolean|null;shippingClass?:string|null}[];
  selectedTemplateId:unknown;quotedVehicles?:{id:number|string}[];
}):Promise<number|null>{
  if(input.selectedTemplateId==null)return null;
  if (Number.isSafeInteger(Number(input.contractId)) && Number(input.contractId) > 0) {
    throw new ShippingConfigurationError("Contract vehicle templates are selected automatically by the system.", 422);
  }
  throw new ShippingConfigurationError("Invalid bulk vehicle selection.", 422);
}
