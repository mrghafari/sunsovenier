import {Router} from "express";
import {accountingDb} from "./db";
import {sql} from "drizzle-orm";
import {AccountingError,assertAccountingOrigin} from "./access";
import {resolveCommercialAccess,readCommercialWeight,approveCommercialWeight} from "./commercial-weight";
export function createCommercialAccountingRouter(){
  const router=Router();
  router.use(async(req,res,next)=>{
    try{
      res.locals.commercialActor=await resolveCommercialAccess(req);
      if(!["GET","HEAD","OPTIONS"].includes(req.method))assertAccountingOrigin(req);
      res.setHeader("Cache-Control","no-store");next();
    }catch(e){next(e);}
  });
  router.get("/companies",async(_req,res,next)=>{
    try{res.json((await accountingDb.execute(sql`select id,name from accounting_companies where is_active order by id`)).rows);}
    catch(e){next(e);}
  });
  router.get("/loading-weight",async(req,res,next)=>{
    try{res.json(await readCommercialWeight(req.query,res.locals.commercialActor));}catch(e){next(e);}
  });
  router.post("/loading-weight/approve",async(req,res,next)=>{
    try{res.json(await approveCommercialWeight(req.body,res.locals.commercialActor));}catch(e){next(e);}
  });
  router.use((error:unknown,_req:Parameters<typeof assertAccountingOrigin>[0],res:any,_next:any)=>{
    if(error instanceof AccountingError)return res.status(error.status).json({code:error.code,message:error.message});
    console.error("Commercial weight review failed",error);
    res.status(500).json({code:"COMMERCIAL_WEIGHT_ERROR",message:"Unable to process Commercial weight review"});
  });
  return router;
}
