export interface InventoryAdapter{
  checkAvailability(productId:string,batchId:string,quantityKg:string):Promise<{available:boolean;source:"module-simulation";realInventory:false}>;
  deductStock(loadingId:string,productId:string,batchId:string,quantityKg:string):Promise<{duplicate:boolean;realStockChanged:false}>;
}
export interface ProductAdapter{getProduct(sourceId:string):Promise<unknown|null>}
export interface CustomerAdapter{getCustomer(namespace:"shop"|"crm",sourceId:string):Promise<unknown|null>}
export interface PlateReaderService{readPlate():Promise<{plate:string;simulated:boolean}>}
export interface RfidService{readCard():Promise<{card:string;simulated:boolean}>}
export interface WeighbridgeService{readWeight():Promise<{weightKg:string;simulated:boolean}>}
export interface FlowmeterService{readQuantity():Promise<{quantityKg:string;simulated:boolean}>}