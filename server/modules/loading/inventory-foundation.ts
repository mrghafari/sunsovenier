import {quantity,quantityText,withinPercent} from "../../../shared/loading/quantity";
import {LoadingError} from "./errors";
import {loadingTransaction,type LoadingTransaction} from "./db";
// Foundation primitive, not a public endpoint. Phase-three services must derive
// all measurements/approvals from stored evidence, never request-body booleans.
export async function issueDocumentsWithSimulatedStock(loadingId:string,actor:{namespace:"admin"|"custom";id:number},callerTx?:LoadingTransaction){
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(loadingId))throw new LoadingError("Invalid Loading ID");
  if(!["admin","custom"].includes(actor.namespace)||!Number.isSafeInteger(actor.id)||actor.id<=0)throw new LoadingError("Verified staff identity required",403);
  const run=async(tx:LoadingTransaction)=>{
    const row=(await tx.query(`SELECT l.*,o.batch_id,o.product_id,o.quantity_kg::text AS ordered_kg
      FROM loading_loadings l JOIN loading_orders o ON o.id=l.order_id WHERE l.id=$1 FOR UPDATE OF l,o`,[loadingId])).rows[0];
    if(!row)throw new LoadingError("Loading not found",404);
    const movement=(await tx.query("SELECT id,batch_id,quantity_kg::text FROM loading_stock_movements WHERE loading_id=$1 AND kind='DEDUCTION'",[loadingId])).rows[0];
    if(movement){
      if(!["DOCUMENTS_ISSUED","WAREHOUSE_GATE_OUT","MAIN_GATE_OUT","CLOSED"].includes(row.status)||movement.batch_id!==row.batch_id||
        quantity(movement.quantity_kg)!==quantity(String(row.net_kg)))throw new LoadingError("Inconsistent loading deduction evidence",409);
      return {loadingId,duplicate:true,simulation:true,realStockChanged:false};
    }
    if(row.status!=="GROSS_WEIGH"||!row.gross_approved||!row.seal_number?.trim()||!row.is_simulated)throw new LoadingError("Approved gross weighing, seal and simulation mode required",409);
    const net=quantity(String(row.net_kg)),gross=quantity(String(row.gross_kg)),tare=quantity(String(row.tare_kg));
    if(tare<=0n||gross<=tare||net!==gross-tare)throw new LoadingError("Stored weights are inconsistent");
    const settings=(await tx.query("SELECT quantity_tolerance_percent::text AS tolerance,inventory_mode FROM loading_settings WHERE id=1")).rows[0];
    if(!settings||settings.inventory_mode!=="MODULE_SIMULATION")throw new LoadingError("Module-owned simulation inventory is required");
    if(!withinPercent(quantityText(net),String(row.quantity_kg),settings.tolerance)||!withinPercent(quantityText(net),String(row.recorded_kg),settings.tolerance))
      throw new LoadingError("Net weight needs a new approved weighing within tolerance",409);
    const documents=(await tx.query("SELECT kind FROM loading_documents WHERE loading_id=$1 AND status='READY' AND is_simulated",[loadingId])).rows;
    if(new Set(documents.map(d=>d.kind)).size!==5)throw new LoadingError("All five simulated documents must be ready");
    const batch=(await tx.query("SELECT product_id FROM loading_batches WHERE id=$1",[row.batch_id])).rows[0];
    if(batch?.product_id!==row.product_id)throw new LoadingError("Order batch and product mismatch");
    const already=quantity(String((await tx.query(`SELECT coalesce(sum(m.quantity_kg),0)::text AS quantity FROM loading_stock_movements m
      JOIN loading_loadings l ON l.id=m.loading_id WHERE l.order_id=$1 AND m.kind='DEDUCTION'`,[row.order_id])).rows[0].quantity));
    if(already+net>quantity(row.ordered_kg)&&!withinPercent(quantityText(already+net),row.ordered_kg,settings.tolerance))
      throw new LoadingError("Total documented truck quantities exceed the order tolerance",409);
    const stock=(await tx.query("SELECT quantity_kg::text AS quantity FROM loading_stock WHERE batch_id=$1 FOR UPDATE",[row.batch_id])).rows[0];
    if(!stock||quantity(stock.quantity)<net)throw new LoadingError("Insufficient module-owned simulation stock",409);
    await tx.query("UPDATE loading_stock SET quantity_kg=quantity_kg-$1::numeric,version=version+1 WHERE batch_id=$2",[quantityText(net),row.batch_id]);
    await tx.query("INSERT INTO loading_stock_movements(loading_id,batch_id,kind,quantity_kg,actor_namespace,actor_id) VALUES($1,$2,'DEDUCTION',$3,$4,$5)",
      [loadingId,row.batch_id,quantityText(net),actor.namespace,actor.id]);
    await tx.query("UPDATE loading_loadings SET status='DOCUMENTS_ISSUED',version=version+1,updated_at=now() WHERE id=$1",[loadingId]);
    await tx.query("INSERT INTO loading_audit_logs(loading_id,actor_namespace,actor_id,action,from_state,to_state,details) VALUES($1,$2,$3,'ISSUE_DOCUMENTS','GROSS_WEIGH','DOCUMENTS_ISSUED',$4)",
      [loadingId,actor.namespace,actor.id,JSON.stringify({simulation:true,quantityKg:quantityText(net),realInventoryChanged:false})]);
    return {loadingId,duplicate:false,simulation:true,realStockChanged:false};
  };
  return callerTx?run(callerTx):loadingTransaction(run);
}