import type {LoadingRole,LoadingState} from "../../../shared/loading/contracts";
import {quantity,quantityText,withinPercent} from "../../../shared/loading/quantity";
import {LoadingError} from "./errors";
export type LoadingAction="ASSIGN_CARRIER"|"ISSUE_PERMIT"|"MAIN_GATE_IN"|"JOIN_YARD"|"CALL"|"WAREHOUSE_GATE_IN"|
  "TARE_WEIGH"|"START_LOADING"|"GROSS_WEIGH"|"RETURN_TO_LOADING"|"ISSUE_DOCUMENTS"|"WAREHOUSE_GATE_OUT"|"MAIN_GATE_OUT"|"CLOSE"|"CANCEL";
export interface TransitionEvidence{
  creditApproved?:boolean;stockAvailable?:boolean;carrierValid?:boolean;permitValid?:boolean;identityMatches?:boolean;
  safetyPassed?:boolean;capacityAvailable?:boolean;called?:boolean;tareKg?:string;registeredTareKg?:string;tareTolerancePercent?:string;
  supervisorApproved?:boolean;reason?:string;productMatches?:boolean;batchMatches?:boolean;bayAvailable?:boolean;
  loadingComplete?:boolean;seal?:string;grossKg?:string;orderedKg?:string;recordedKg?:string;quantityTolerancePercent?:string;
  grossApproved?:boolean;documentsReady?:boolean;exitVerified?:boolean;passCollected?:boolean;insidePlant?:boolean;stockDeducted?:boolean;
}
const rules:Record<LoadingAction,{from:readonly LoadingState[];to:LoadingState;roles:readonly LoadingRole[]}>={
  ASSIGN_CARRIER:{from:["ORDER_CREATED"],to:"CARRIER_ASSIGNED",roles:["customer","sales_admin","loading_manager"]},
  ISSUE_PERMIT:{from:["CARRIER_ASSIGNED"],to:"ENTRY_PERMIT_ISSUED",roles:["sales_admin","loading_manager"]},
  MAIN_GATE_IN:{from:["ENTRY_PERMIT_ISSUED"],to:"MAIN_GATE_IN",roles:["main_gate_officer","loading_manager"]},
  JOIN_YARD:{from:["MAIN_GATE_IN"],to:"WAITING_YARD",roles:["main_gate_officer","loading_manager"]},
  CALL:{from:["WAITING_YARD"],to:"CALLED",roles:["warehouse_manager","loading_manager"]},
  WAREHOUSE_GATE_IN:{from:["CALLED"],to:"WAREHOUSE_GATE_IN",roles:["warehouse_gate_officer","loading_manager"]},
  TARE_WEIGH:{from:["WAREHOUSE_GATE_IN"],to:"TARE_WEIGH",roles:["weighbridge_operator","loading_manager"]},
  START_LOADING:{from:["TARE_WEIGH"],to:"LOADING",roles:["loading_operator","loading_manager"]},
  GROSS_WEIGH:{from:["LOADING"],to:"GROSS_WEIGH",roles:["weighbridge_operator","loading_manager"]},
  RETURN_TO_LOADING:{from:["GROSS_WEIGH","LOADING"],to:"LOADING",roles:["warehouse_manager","loading_manager"]},
  ISSUE_DOCUMENTS:{from:["GROSS_WEIGH"],to:"DOCUMENTS_ISSUED",roles:["warehouse_manager","loading_manager"]},
  WAREHOUSE_GATE_OUT:{from:["DOCUMENTS_ISSUED"],to:"WAREHOUSE_GATE_OUT",roles:["warehouse_gate_officer","loading_manager"]},
  MAIN_GATE_OUT:{from:["WAREHOUSE_GATE_OUT"],to:"MAIN_GATE_OUT",roles:["main_gate_officer","loading_manager"]},
  CLOSE:{from:["MAIN_GATE_OUT"],to:"CLOSED",roles:["main_gate_officer","loading_manager"]},
  CANCEL:{from:["ORDER_CREATED","CARRIER_ASSIGNED","ENTRY_PERMIT_ISSUED","MAIN_GATE_IN","WAITING_YARD","CALLED","WAREHOUSE_GATE_IN",
    "TARE_WEIGH","LOADING","GROSS_WEIGH"],to:"CANCELLED",roles:["warehouse_manager","loading_manager"]},
};
function need(value:unknown,message:string){if(value!==true)throw new LoadingError(message);}
function positive(v?:string){if(!v||quantity(v)<=0n)throw new LoadingError("A positive measured kg weight is required");return v;}
export function transitionLoading(state:LoadingState,action:LoadingAction,role:LoadingRole,e:TransitionEvidence={}):LoadingState{
  const rule=rules[action];
  if(!rule||!rule.from.includes(state))throw new LoadingError("This action is not allowed from the current stage",409,"INVALID_TRANSITION");
  if(!rule.roles.includes(role))throw new LoadingError("This role cannot perform that action",403,"ROLE_DENIED");
  switch(action){
    case"ASSIGN_CARRIER":need(e.creditApproved,"Credit is not approved");need(e.stockAvailable,"Inventory has not been checked");need(e.carrierValid,"Carrier, driver or vehicle validation failed");break;
    case"ISSUE_PERMIT":need(e.carrierValid,"Carrier documents must remain valid");need(e.capacityAvailable,"Appointment capacity is unavailable");break;
    case"MAIN_GATE_IN":need(e.permitValid,"A valid unused entry permit is required");need(e.identityMatches,"Permit, driver and vehicle do not match");
      need(e.safetyPassed,"Safety checklist is incomplete");need(e.capacityAvailable,"Plant capacity is full");break;
    case"WAREHOUSE_GATE_IN":need(e.called,"The warehouse has not called this truck");need(e.safetyPassed,"Warehouse safety approval is required");break;
    case"TARE_WEIGH":{
      const actual=positive(e.tareKg),expected=positive(e.registeredTareKg);
      if(!e.tareTolerancePercent)throw new LoadingError("Configure the tare deviation threshold");
      if(!withinPercent(actual,expected,e.tareTolerancePercent)){
        need(e.supervisorApproved,"Tare deviation needs supervisor approval");if(!e.reason?.trim())throw new LoadingError("Supervisor reason is required");
      }break;
    }
    case"START_LOADING":positive(e.tareKg);need(e.productMatches,"Wrong product");need(e.batchMatches,"Wrong batch");need(e.bayAvailable,"Loading bay is unavailable");break;
    case"GROSS_WEIGH":{
      need(e.loadingComplete,"Loading has not completed");if(!e.seal?.trim())throw new LoadingError("Seal number is required");
      const gross=quantity(positive(e.grossKg)),tare=quantity(positive(e.tareKg));
      if(gross<=tare)throw new LoadingError("Gross weight must exceed tare weight");
      positive(e.orderedKg);positive(e.recordedKg);
      if(!e.quantityTolerancePercent)throw new LoadingError("Configure quantity tolerance");
      const net=gross-tare,netText=quantityText(net);
      if(!withinPercent(netText,e.orderedKg!,e.quantityTolerancePercent)||!withinPercent(netText,e.recordedKg!,e.quantityTolerancePercent))
        throw new LoadingError("Weight is outside tolerance; approved return to loading with a reason is required",409,"QUANTITY_DEVIATION");
      break;
    }
    case"RETURN_TO_LOADING":need(e.supervisorApproved,"Supervisor approval is required");if(!e.reason?.trim())throw new LoadingError("Return reason is required");break;
    case"ISSUE_DOCUMENTS":positive(e.tareKg);positive(e.grossKg);need(e.grossApproved,"Gross weighing must be approved");need(e.documentsReady,"All five documents must be ready");if(!e.seal?.trim())throw new LoadingError("Seal number required");break;
    case"WAREHOUSE_GATE_OUT":need(e.documentsReady,"Documents must be issued");need(e.grossApproved,"Gross approval required");need(e.exitVerified,"Documents, seal, plate and weight must match");break;
    case"MAIN_GATE_OUT":need(e.exitVerified,"Final inspection is required");need(e.passCollected,"Pass card must be collected and invalidated");break;
    case"CANCEL":if(e.insidePlant!==false)throw new LoadingError("An inside-plant truck requires a controlled exit exception, not ordinary cancellation");
      if(e.stockDeducted!==false)throw new LoadingError("Deducted stock requires a documented return");if(!e.reason?.trim())throw new LoadingError("Cancellation reason required");break;
  }
  return rule.to;
}