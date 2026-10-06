import { Router, type Request, type Response, type NextFunction } from "express";
import {sql} from "drizzle-orm";
import { accountingDb } from "./db";
import {z} from "zod";
import { accountingCompanies, accountingCurrencies } from "./schema";
import { resolveAccountingAccess, AccountingError, assertAccountingOrigin } from "./access";
import { resourceName, listResource, saveResource } from "./settings-service";
import { seedAccounting } from "./seed";
import { POSTING_KEYS, accountingResources, type AccountingAccess } from "@shared/accounting-api";
import { databaseErrorCode } from "./errors";
import { assertLedgerReady } from "./readiness";
import { captureOperationalEvent } from "./events";
import {linkWallet,recordWalletMovement,releaseWalletHold,approveWalletOrder} from "./wallet";
import {recordCustomerReceipt,transitionCheque,readReceivables,returnCustomerReceipt} from "./receipts";
import {readReceiptList,readReceiptDetail,readReceiptCustomers,readReceiptOpenItems} from "./receipt-workbench";
import {receiptListCsv} from "./receipt-workbench-csv";
import {settleWalletReceivable} from "./wallet-settlement";
import {readAccountingReport} from "./reports";
import {accountingReportCsv} from "./report-csv";
import {readAccountingCostReport} from "./cost-reports";
import {accountingCostReportCsv} from "./cost-report-csv";
import {readShippingMarginReport} from "./shipping-reports";
import {shippingMarginCsv} from "./shipping-report-csv";
import {readLoadingPreviews} from "./loading-previews";
import {readInventoryDocumentMetadata,readInventoryDocuments,readInventoryDocument,saveInventoryDocument,actInventoryDocument} from "./inventory-documents";
import {readInventoryFifo} from "./inventory-fifo";
import {readLoadingInvoiceWorkbench,issueLoadingInvoice} from "./loading-invoices";
import {readShipmentCosts,postShipmentCost,captureShipmentCost} from "./shipment-costs";
import {readLoadingReturns,returnLoadingInvoice} from "./loading-returns";
import {readWalletRefundPlan,recordDocumentedWalletRefund,readDocumentedWalletRefunds} from "./wallet-refunds";
import {readPartialReturnPlan,postPartialReturn,readPartialReturnHistory,readPartialReturnTargets} from "./partial-returns";
import {readPostingQueue,previewQueuedPosting,enqueueReviewedPosting,processReviewedPostingBatch} from "./posting-queue";
import {postingQueueScopeSchema} from "@shared/accounting-posting-queue";
import {assertPipelineManager} from "./loading-invoice-stock";
import {readZeroStart,activateZeroStart} from "./zero-start";
import {readCapitalizationWorkbench,capitalizeInventoryDocument} from "./inventory-capitalization";
import {stockBookMetadata,registerStockBook} from "./loading-invoice-stock";
import {approveLoadingShipping} from "./loading-shipping";
import {readLoadingCaptureContext,captureMeasuredLoading} from "./loading-capture";
import {readAccountingAudit,accountingAuditCsv} from "./audit-reports";
import {readCustomerReport} from "./customer-reports";
import {customerReportCsv} from "./customer-report-csv";
import {readCreditExposure} from "./credit-exposure";
import {registerCreditOrder,approveCreditOrder} from "./credit-orders";
import {readManualMetadata,readManualDocuments,readManualDocument,previewManualDocument,
  saveManualDocument,postManualDocument,discardManualDocument,reverseManualDocument} from "./manual-documents";

export function createAccountingRouter() {
  const router = Router();
  router.use(async (req: Request,res: Response,next: NextFunction) => {
    try {
      res.locals.accountingAccess = await resolveAccountingAccess(req);
      if (!["GET","HEAD","OPTIONS"].includes(req.method)) {
        assertAccountingOrigin(req);
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
      const integration=(await accountingDb.execute(sql`select exists(select 1 from accounting_companies
        where accounting_posting_enabled(id)) enabled`)).rows[0];
      res.json({access:res.locals.accountingAccess,companies,currencies,resources:accountingResources,
        postingKeys:POSTING_KEYS,integrationEnabled:integration.enabled===true});
    } catch (error) { next(error); }
  });
  router.get("/v2/zero-start",async(req,res,next)=>{
    try{res.json(await readZeroStart(Number(req.query.companyId)));}catch(e){next(e);}
  });
  router.post("/v2/zero-start",async(req,res,next)=>{
    try{res.json(await activateZeroStart(req.body,res.locals.accountingAccess));}catch(e){next(e);}
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
  router.get("/v2/loading-previews",async(req,res,next)=>{
    try{res.setHeader("Cache-Control","no-store");res.json(await readLoadingPreviews(req.query));}catch(e){next(e);}
  });
  router.post("/v2/loading-shipping/approve",async(req,res,next)=>{
    try{res.setHeader("Cache-Control","no-store");res.json(await approveLoadingShipping(req.body,res.locals.accountingAccess));}
    catch(e){next(e);}
  });
  router.get("/v2/loading-context",async(req,res,next)=>{
    try{res.setHeader("Cache-Control","no-store");res.json(await readLoadingCaptureContext(req.query,res.locals.accountingAccess));}catch(e){next(e);}
  });
  router.post("/v2/loading-capture",async(req,res,next)=>{
    try{res.setHeader("Cache-Control","no-store");res.json(await captureMeasuredLoading(req.body,res.locals.accountingAccess));}catch(e){next(e);}
  });
  router.get("/v2/audit",async(req,res,next)=>{
    try{res.setHeader("Cache-Control","no-store");res.json(await readAccountingAudit(req.query));}catch(e){next(e);}
  });
  router.get("/v2/audit/csv",async(req,res,next)=>{
    try{
      const r=await readAccountingAudit(req.query,undefined,true);
      res.setHeader("Cache-Control","no-store");res.setHeader("Content-Type","text/csv; charset=utf-8");
      res.setHeader("Content-Disposition",`attachment; filename="accounting-audit-${r.company.id}-${r.filters.from}-${r.filters.to}.csv"`);
      res.send(accountingAuditCsv(r));
    }catch(e){next(e);}
  });
  router.post("/v2/wallets/settle",async(req,res,next)=>{
    try{res.json(await settleWalletReceivable(req.body,res.locals.accountingAccess));}
    catch(error){next(error);}
  });
  router.get("/v2/shipping-margin/csv",async(req,res,next)=>{
    try{
      const r=await readShippingMarginReport(req.query,undefined,true);
      res.set({"Content-Type":"text/csv; charset=utf-8","Cache-Control":"private, no-store",
        "Content-Disposition":`attachment; filename="shipping-margin-${r.company.id}-${r.filters.from}-${r.filters.to}.csv"`});
      res.send(shippingMarginCsv(r));
    }catch(e){next(e);}
  });
  router.get("/v2/shipping-margin",async(req,res,next)=>{
    try{res.set("Cache-Control","private, no-store");res.json(await readShippingMarginReport(req.query));}catch(e){next(e);}
  });
  router.get("/v2/cost-reports/csv",async(req,res,next)=>{
    try{
      const report=await readAccountingCostReport(req.query,undefined,true);
      res.set({"Content-Type":"text/csv; charset=utf-8","Cache-Control":"private, no-store",
        "Content-Disposition":`attachment; filename="accounting-costs-${report.company.id}-${report.filters.from}-${report.filters.to}.csv"`});
      res.send(accountingCostReportCsv(report));
    }catch(e){next(e);}
  });
  router.get("/v2/cost-reports",async(req,res,next)=>{
    try{res.set("Cache-Control","private, no-store");res.json(await readAccountingCostReport(req.query));}catch(e){next(e);}
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
  router.get("/v2/credit-exposure",async(req,res,next)=>{
    try {
      res.set("Cache-Control","private, no-store");
      res.json(await readCreditExposure(Number(req.query.companyId),Number(req.query.walletId)));
    }catch(e){next(e);}
  });
  router.post("/v2/credit-orders",async(req,res,next)=>{
    try { res.status(201).json(await registerCreditOrder(req.body,res.locals.accountingAccess)); }
    catch(e){next(e);}
  });
  router.post("/v2/credit-orders/:orderId/approve",async(req,res,next)=>{
    try { res.json(await approveCreditOrder(Number(req.params.orderId),req.body.notes,res.locals.accountingAccess)); }
    catch(e){next(e);}
  });
  router.post("/v2/receipts",async(req,res,next)=>{
    try{res.status(201).json(await recordCustomerReceipt(req.body,res.locals.accountingAccess));}catch(e){next(e);}
  });
  router.get("/v2/receipts/csv",async(req,res,next)=>{
    try{const data=await readReceiptList(req.query,undefined,true);
      res.set({"Content-Type":"text/csv; charset=utf-8","Cache-Control":"private, no-store",
        "Content-Disposition":`attachment; filename="accounting-receipts-${data.metadata.company.id}.csv"`});
      res.send(receiptListCsv(data));
    }catch(e){next(e);}
  });
  router.get("/v2/receipts",async(req,res,next)=>{
    try{res.set("Cache-Control","private, no-store");res.json(await readReceiptList(req.query));}catch(e){next(e);}
  });
  router.get("/v2/receipts/:id",async(req,res,next)=>{
    try{res.set("Cache-Control","private, no-store");res.json(await readReceiptDetail(req.params.id,req.query.companyId));}catch(e){next(e);}
  });
  router.get("/v2/receipt-workbench/customers",async(req,res,next)=>{
    try{res.set("Cache-Control","private, no-store");res.json(await readReceiptCustomers(req.query));}catch(e){next(e);}
  });
  router.get("/v2/receipt-workbench/receivables",async(req,res,next)=>{
    try{res.set("Cache-Control","private, no-store");res.json(await readReceiptOpenItems(req.query));}catch(e){next(e);}
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
  router.get("/v2/manual-documents/metadata",async(req,res,next)=>{
    try{res.set("Cache-Control","private, no-store");res.json(await readManualMetadata(req.query.companyId));}catch(e){next(e);}
  });
  router.get("/v2/manual-documents",async(req,res,next)=>{
    try{res.set("Cache-Control","private, no-store");res.json(await readManualDocuments(req.query));}catch(e){next(e);}
  });
  router.get("/v2/manual-documents/:id",async(req,res,next)=>{
    try{res.set("Cache-Control","private, no-store");res.json(await readManualDocument(req.params.id,req.query.companyId));}catch(e){next(e);}
  });
  router.post("/v2/manual-documents/preview",async(req,res,next)=>{
    try{res.set("Cache-Control","private, no-store");res.json(await previewManualDocument(req.body));}catch(e){next(e);}
  });
  router.post("/v2/manual-documents",async(req,res,next)=>{
    try{res.json(await saveManualDocument(req.body,res.locals.accountingAccess));}catch(e){next(e);}
  });
  router.post("/v2/manual-documents/:id/post",async(req,res,next)=>{
    try{res.json(await postManualDocument(req.params.id,req.body,res.locals.accountingAccess));}catch(e){next(e);}
  });
  router.post("/v2/manual-documents/:id/discard",async(req,res,next)=>{
    try{res.json(await discardManualDocument(req.params.id,req.body,res.locals.accountingAccess));}catch(e){next(e);}
  });
  router.post("/v2/manual-documents/:id/reverse",async(req,res,next)=>{
    try{res.json(await reverseManualDocument(req.params.id,req.body,res.locals.accountingAccess));}catch(e){next(e);}
  });
  router.get("/v2/inventory-documents/metadata",async(req,res,next)=>{
    try{res.json(await readInventoryDocumentMetadata(req.query.companyId));}catch(e){next(e);}
  });
  router.get("/v2/inventory-fifo-preview",async(req,res,next)=>{
    try{res.json(await readInventoryFifo(req.query));}catch(e){next(e);}
  });
  router.get("/v2/loading-invoices",async(req,res,next)=>{
    try{res.set("Cache-Control","private, no-store");res.json(await readLoadingInvoiceWorkbench(req.query));}catch(e){next(e);}
  });
  router.get("/v2/loading-returns",async(req,res,next)=>{
    try{res.set("Cache-Control","private, no-store");res.json(await readLoadingReturns(req.query));}catch(e){next(e);}
  });
  router.get("/v2/partial-returns/targets",async(req,res,next)=>{
    try{res.set("Cache-Control","private, no-store");res.json(await readPartialReturnTargets(req.query));}catch(e){next(e);}
  });
  router.get("/v2/partial-returns/history",async(req,res,next)=>{
    try{res.set("Cache-Control","private, no-store");res.json(await readPartialReturnHistory(req.query));}catch(e){next(e);}
  });
  router.post("/v2/partial-returns/preview",async(req,res,next)=>{
    try{assertAccountingOrigin(req);res.set("Cache-Control","private, no-store");res.json(await readPartialReturnPlan(req.body));}catch(e){next(e);}
  });
  router.post("/v2/partial-returns",async(req,res,next)=>{
    try{assertAccountingOrigin(req);res.set("Cache-Control","private, no-store");res.json(await postPartialReturn(req.body,res.locals.accountingAccess));}catch(e){next(e);}
  });
  router.post("/v2/loading-returns",async(req,res,next)=>{
    try{assertAccountingOrigin(req);res.json(await returnLoadingInvoice(req.body,res.locals.accountingAccess));}catch(e){next(e);}
  });
  router.post("/v2/wallet-refunds/preview",async(req,res,next)=>{
    try{assertAccountingOrigin(req);res.set("Cache-Control","private, no-store");res.json(await readWalletRefundPlan(req.body));}catch(e){next(e);}
  });
  router.post("/v2/wallet-refunds",async(req,res,next)=>{
    try{assertAccountingOrigin(req);res.set("Cache-Control","private, no-store");res.json(await recordDocumentedWalletRefund(req.body,res.locals.accountingAccess));}catch(e){next(e);}
  });
  router.get("/v2/wallet-refunds/history",async(req,res,next)=>{
    try{res.set("Cache-Control","private, no-store");res.json(await readDocumentedWalletRefunds(req.query));}catch(e){next(e);}
  });
  router.get("/v2/processing",async(req,res,next)=>{
    try{res.set("Cache-Control","private, no-store");res.json(await readPostingQueue(req.query));}catch(e){next(e);}
  });
  router.post("/v2/processing/preview",async(req,res,next)=>{
    try{assertAccountingOrigin(req);res.set("Cache-Control","private, no-store");res.json(await previewQueuedPosting(req.body));}catch(e){next(e);}
  });
  router.post("/v2/processing",async(req,res,next)=>{
    try{assertAccountingOrigin(req);res.set("Cache-Control","private, no-store");
      res.json(await enqueueReviewedPosting(req.body,res.locals.accountingAccess));}catch(e){next(e);}
  });
  router.post("/v2/processing/run",async(req,res,next)=>{
    try{assertAccountingOrigin(req);res.set("Cache-Control","private, no-store");
      const scope=postingQueueScopeSchema.parse(req.body);
      await accountingDb.transaction(tx=>assertPipelineManager(tx,res.locals.accountingAccess));
      res.json(await processReviewedPostingBatch(scope.companyId));
    }catch(e){next(e);}
  });
  router.get("/v2/shipment-costs",async(req,res,next)=>{
    try{res.set("Cache-Control","private, no-store");res.json(await readShipmentCosts(req.query));}catch(e){next(e);}
  });
  router.post("/v2/shipment-costs",async(req,res,next)=>{
    try{assertAccountingOrigin(req);res.json(await postShipmentCost(req.body,res.locals.accountingAccess));}catch(e){next(e);}
  });
  router.post("/v2/shipment-costs/capture",async(req,res,next)=>{
    try{assertAccountingOrigin(req);res.status(201).json(await captureShipmentCost(req.body,res.locals.accountingAccess));}catch(e){next(e);}
  });
  router.get("/v2/inventory-capitalizations",async(req,res,next)=>{
    try{res.set("Cache-Control","private, no-store");res.json(await readCapitalizationWorkbench(req.query));}catch(e){next(e);}
  });
  router.post("/v2/inventory-capitalizations",async(req,res,next)=>{
    try{assertAccountingOrigin(req);res.json(await capitalizeInventoryDocument(req.body,res.locals.accountingAccess));}catch(e){next(e);}
  });
  router.post("/v2/loading-invoices",async(req,res,next)=>{
    try{assertAccountingOrigin(req);res.json(await issueLoadingInvoice(req.body,res.locals.accountingAccess));}catch(e){next(e);}
  });
  router.get("/v2/stock-books",async(req,res,next)=>{
    try{const parsed=z.coerce.number().int().positive().max(2147483647).safeParse(req.query.companyId);
      if(!parsed.success)throw new AccountingError(parsed.error.issues[0].message);
      res.set("Cache-Control","private, no-store");res.json(await stockBookMetadata(parsed.data));}catch(e){next(e);}
  });
  router.post("/v2/stock-books",async(req,res,next)=>{
    try{assertAccountingOrigin(req);res.json(await registerStockBook(req.body,res.locals.accountingAccess));}catch(e){next(e);}
  });
  router.get("/v2/inventory-documents",async(req,res,next)=>{
    try{res.json(await readInventoryDocuments(req.query));}catch(e){next(e);}
  });
  router.get("/v2/inventory-documents/:id",async(req,res,next)=>{
    try{res.json(await readInventoryDocument(req.params.id,req.query.companyId));}catch(e){next(e);}
  });
  router.post("/v2/inventory-documents",async(req,res,next)=>{
    try{assertAccountingOrigin(req);res.json(await saveInventoryDocument(req.body,res.locals.accountingAccess));}catch(e){next(e);}
  });
  for(const action of ["approve","discard","void"] as const)router.post(`/v2/inventory-documents/:id/${action}`,async(req,res,next)=>{
    try{assertAccountingOrigin(req);res.json(await actInventoryDocument(req.params.id,action,req.body,res.locals.accountingAccess));}catch(e){next(e);}
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