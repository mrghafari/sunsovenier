import {pool} from "../../db";
import type {PoolClient} from "@neondatabase/serverless";
export type LoadingTransaction=Pick<PoolClient,"query">;
export async function loadingTransaction<T>(run:(tx:LoadingTransaction)=>Promise<T>):Promise<T>{
  const tx=await pool.connect();
  try{await tx.query("BEGIN");const result=await run(tx);await tx.query("COMMIT");return result;}
  catch(e){await tx.query("ROLLBACK");throw e;}finally{tx.release();}
}