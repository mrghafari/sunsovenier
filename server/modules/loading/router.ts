import {Router} from "express";
import {pool} from "../../db";
import {loadingModuleStatus} from "./flag";
import {LoadingError} from "./errors";
import {resolveLoadingFoundationAccess} from "./access";
import {loadingTableNames} from "./schema";
import {LOADING_STATES} from "../../../shared/loading/contracts";
export function createLoadingRouter(){
  const router=Router();
  router.use((_req,res,next)=>{res.setHeader("Cache-Control","no-store");next();});
  router.get("/module-status",(_req,res)=>res.json(loadingModuleStatus()));
  router.use((_req,res,next)=>{if(!loadingModuleStatus().enabled)return res.status(404).json({message:"Loading module is disabled",code:"MODULE_DISABLED"});next();});
  router.get("/foundation",async(req,res,next)=>{
    try{
      const access=await resolveLoadingFoundationAccess(req);
      const rows=(await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename=ANY($1::text[])",[[...loadingTableNames]])).rows;
      const present=new Set(rows.map(r=>r.tablename)),missingTables=loadingTableNames.filter(t=>!present.has(t));
      res.json({...loadingModuleStatus(),...access,schemaReady:!missingTables.length,missingTables,states:LOADING_STATES,workflowApiAvailable:false});
    }catch(e){next(e);}
  });
  router.use((_req,res)=>res.status(404).json({message:"Operational loading APIs are not installed in foundation phase",code:"PHASE_NOT_AVAILABLE"}));
  router.use((e:unknown,_req:unknown,res:any,_next:unknown)=>{
    if(e instanceof LoadingError)return res.status(e.status).json({message:e.message,code:e.code});
    console.error("[LOADING FOUNDATION]",e instanceof Error?e.message:"Unexpected error");
    return res.status(500).json({message:"Loading module could not read its foundation",code:"LOADING_INTERNAL"});
  });
  return router;
}