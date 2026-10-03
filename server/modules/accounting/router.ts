import { Router, type Request, type Response, type NextFunction } from "express";
import { accountingDb } from "./db";
import { accountingCompanies, accountingCurrencies } from "./schema";
import { resolveAccountingAccess, AccountingError } from "./access";
import { resourceName, listResource, saveResource } from "./settings-service";
import { seedAccounting } from "./seed";
import { POSTING_KEYS, accountingResources, type AccountingAccess } from "@shared/accounting-api";
import { databaseErrorCode } from "./errors";
import { assertLedgerReady } from "./readiness";
import { captureOperationalEvent } from "./events";
import {linkWallet,recordWalletMovement,releaseWalletHold,approveWalletOrder} from "./wallet";
import {recordCustomerReceipt,transitionCheque,readReceivables,returnCustomerReceipt} from "./receipts";
import {settleWalletReceivable} from "./wallet-settlement";
import {readAccountingReport} from "./reports";
import {accountingReportCsv} from "./report-csv";
import {readCustomerReport} from "./customer-reports";
import {customerReportCsv} from "./customer-report-csv";

export function createAccountingRouter() {
  const router = Router();
  router.use(async (req: Request,res: Response,next: NextFunction) => {
    try {
      res.locals.accountingAccess = await resolveAccountingAccess(req);
      if (!["GET","HEAD","OPTIONS"].includes(req.method)) {
        const origin = req.get("origin");
        let originHost: string | undefined;
        try {
          const url = new URL(origin || "");
          if (["https:","http:"].includes(url.protocol)) originHost = url.host;
        } catch { /* Missing/invalid Origin is denied, not silently allowed. */ }
        const allowedHosts = [req.get("host"),req.get("x-forwarded-host")?.split(",")[0].trim()].filter(Boolean);
        if (!originHost || !allowedHosts.includes(originHost)) throw new AccountingError("Same-origin management request required",403,"ORIGIN_DENIED");
      }
      await assertLedgerReady();
      next();
    }
    catch (error) { next(error); }
  });
  router.get("/v2/bootstrap", async (_req,res,next) => {
    try {
      const companies = await accountingDb.select().from(accountingCompanies);
      const currencies = await accountingDb.select().from(accountingCurrencies);
      res.json({access:res.locals.accountingAccess,companies,currencies,resources:accountingResources,postingKeys:POSTING_KEYS,integrationEnabled:false});
    } catch (error) { next(error); }
  });
  router.get("/v2/reports/:report/csv",async(req,res,next)=>{
    try{
      const report=await readAccountingReport(req.params.report,req.query,undefined,true);
      res.set({"Content-Type":"text/csv; charset=utf-8","Cache-Control":"private, no-store",
        "Content-Disposition":`attachment; filename="accounting-${report.report}-${report.company.id}-${report.filters.from}-${report.filters.to}.csv"`});
      res.send(accountingReportCsv(report));
    }catch(e){next(e);}
  });
  router.get("/v2/reports/:report",async(req,res,next)=>{
    try{res.set("Cache-Control","private, no-store");res.json(await readAccountingReport(req.params.report,req.query));}
    catch(e){next(e);}
  });
  router.get("/v2/customer-reports/:report/csv",async(req,res,next)=>{
    try{
      const report=await readCustomerReport(req.params.report,req.query,undefined,true);
      res.set({"Content-Type":"text/csv; charset=utf-8","Cache-Control":"private, no-store",
        "Content-Disposition":`attachment; filename="accounting-${report.report}-${report.company.id}-${report.filters.asOf??report.filters.to}.csv"`});
      res.send(customerReportCsv(report));
    }catch(e){next(e);}
  });
  router.get("/v2/customer-reports/:report",async(req,res,next)=>{
    try{res.set("Cache-Control","private, no-store");res.json(await readCustomerReport(req.params.report,req.query));}
    catch(e){next(e);}
  });
  router.post("/v2/wallets/settle",async(req,res,next)=>{
    try{res.json(await settleWalletReceivable(req.body,res.locals.accountingAccess));}
    catch(error){next(error);}
  });
  router.post("/v2/seed",async (req,res,next) => {
    try {
      const actor = res.locals.accountingAccess as AccountingAccess;
      if (!actor.canManage) throw new AccountingError("Finance management permission required",403,"ACCESS_DENIED");
      const countryCode=req.body?.countryCode??"IQ";
      if(!["IQ","IR"].includes(countryCode))throw new AccountingError("Supported accounting country required");
      res.json(await seedAccounting(actor,countryCode));
    } catch (error) { next(error); }
  });
  router.get("/v2/settings/:resource",async (req,res,next) => {
    try {
      const companyId = req.query.companyId === undefined ? undefined : Number(req.query.companyId);
      if (companyId !== undefined && (!Number.isSafeInteger(companyId)||companyId<=0)) throw new AccountingError("Invalid company ID");
      res.json(await listResource(resourceName(req.params.resource),companyId));
    } catch (error) { next(error); }
  });
  router.post("/v2/settings/:resource",async (req,res,next) => {
    try { res.status(201).json(await saveResource(resourceName(req.params.resource),req.body,res.locals.accountingAccess)); }
    catch (error) { next(error); }
  });
  router.put("/v2/settings/:resource/:id",async (req,res,next) => {
    try {
      const resource = resourceName(req.params.resource);
      const id = resource==="currencies" ? req.params.id : Number(req.params.id);
      if (typeof id==="number" && (!Number.isSafeInteger(id)||id<=0)) throw new AccountingError("Invalid record ID");
      res.json(await saveResource(resource,req.body,res.locals.accountingAccess,id));
    } catch (error) { next(error); }
  });
  // Retire the mock-only accounting endpoints. Real shop/manual invoices remain untouched.
  router.all(["/invoices","/invoices/:id"],(_req,res) => {
    res.status(410).json({code:"LEGACY_MOCK_RETIRED",message:"The old sample invoice service is retired; use the centralized accounting module"});
  });
  router.post("/v2/integrations/operational-events",async(req,res,next)=>{
    try { res.status(201).json(await captureOperationalEvent(req.body,res.locals.accountingAccess)); }
    catch(error){next(error);}
  });
  router.post("/v2/wallets/link",async(req,res,next)=>{
    try {
      const {companyId,walletId}=req.body;
      if(!Number.isSafeInteger(companyId)||companyId<=0||!Number.isSafeInteger(walletId)||walletId<=0)
        throw new AccountingError("Valid company and wallet IDs required");
      res.status(201).json(await linkWallet(companyId,walletId,res.locals.accountingAccess));
    }catch(e){next(e);}
  });
  router.post("/v2/wallets/:kind",async(req,res,next)=>{
    try {
      if(!["topup","refund"].includes(req.params.kind)) throw new AccountingError("Unknown wallet action",404,"NOT_FOUND");
      res.status(201).json(await recordWalletMovement(req.params.kind as "topup"|"refund",req.body,res.locals.accountingAccess));
    }catch(e){next(e);}
  });
  router.post("/v2/wallet-holds/:orderId/release",async(req,res,next)=>{
    try {
      const orderId=Number(req.params.orderId);
      if(!Number.isSafeInteger(orderId)||orderId<=0) throw new AccountingError("Valid order ID required");
      res.json(await releaseWalletHold(orderId,req.body.reason,res.locals.accountingAccess));
    }catch(e){next(e);}
  });
  router.post("/v2/wallet-orders/:orderId/approve",async(req,res,next)=>{
    try {
      const orderId=Number(req.params.orderId);
      if(!Number.isSafeInteger(orderId)||orderId<=0) throw new AccountingError("Valid order ID required");
      res.json(await approveWalletOrder(orderId,String(req.body.notes||""),res.locals.accountingAccess));
    }catch(e){next(e);}
  });
  router.get("/v2/receivables",async(req,res,next)=>{
    try{const companyId=Number(req.query.companyId);
      if(!Number.isSafeInteger(companyId)||companyId<=0)throw new AccountingError("Valid company ID required");
      res.json({items:await readReceivables(companyId)});
    }catch(e){next(e);}
  });
  router.post("/v2/receipts",async(req,res,next)=>{
    try{res.status(201).json(await recordCustomerReceipt(req.body,res.locals.accountingAccess));}catch(e){next(e);}
  });
  router.post("/v2/receipts/:id/cheque/:action",async(req,res,next)=>{
    try{const receiptId=Number(req.params.id),action=req.params.action;
      if(!Number.isSafeInteger(receiptId)||receiptId<=0||!["deposited","cleared","bounced"].includes(action))
        throw new AccountingError("Valid cheque action required");
      res.json(await transitionCheque(receiptId,action as "deposited"|"cleared"|"bounced",req.body,res.locals.accountingAccess));
    }catch(e){next(e);}
  });
  router.post("/v2/receipts/:id/return",async(req,res,next)=>{
    try{res.json(await returnCustomerReceipt(Number(req.params.id),req.body,res.locals.accountingAccess));}
    catch(e){next(e);}
  });
  router.use((error: unknown,_req: Request,res: Response,_next: NextFunction) => {
    if (error instanceof AccountingError) return res.status(error.status).json({code:error.code,message:error.message});
    const code = databaseErrorCode(error);
    if (["23505","23503","23514","P0001"].includes(code || "")) {
      return res.status(409).json({code:"ACCOUNTING_CONFLICT",message:"This change conflicts with ledger integrity, existing references, or another accounting record"});
    }
    console.error("[ACCOUNTING]",error instanceof Error?error.message:"Unknown error");
    res.status(500).json({code:"ACCOUNTING_UNAVAILABLE",message:"Accounting operation failed; no successful save is implied"});
  });
  return router;
}