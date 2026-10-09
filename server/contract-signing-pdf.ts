import puppeteer from "puppeteer";
import fs from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { SigningError, type Ink, type SigningDocument } from "./contract-signing-domain";

const execute = promisify(execFile);
let rendering = 0;
async function chromiumPath() {
  for (const name of ["chromium", "chromium-browser", "google-chrome"]) {
    try { return (await execute("which", [name])).stdout.trim(); } catch { /* Try the next installed binary. */ }
  }
  throw new SigningError("PDF_UNAVAILABLE", 503);
}
const escape = (value: string) => value.replace(/[&<>"']/g, char =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);

export async function createSignedContractPdf(document: SigningDocument, evidence: {
  id: string; signerName: string; email: string; signedAt: Date; readAt: Date; consent: string; strokes: Ink;
}): Promise<Buffer> {
  // Bound browser resource use; a rejected request leaves its OTP unconsumed.
  if (rendering >= 2) throw new SigningError("PDF_BUSY", 503);
  rendering++;
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined;
  try {
    const font = await fs.readFile(path.resolve("public/attached_assets/Vazirmatn-Regular_1753244629836.ttf"));
    const rtl = document.language === "fa" || document.language === "ar";
    const titles = { fa: "گواهی ثبت امضای الکترونیکی", ar: "سجل التوقيع الإلكتروني", en: "Electronic signature record", tr: "Elektronik imza kaydı" };
    const svg = evidence.strokes.map(stroke => `<polyline points="${stroke.map(point =>
      `${point.x * 720},${point.y * 180}`).join(" ")}"/>`).join("");
    // Browser bidi preserves logical Unicode, embedded Latin and digit order.
    // All untrusted strings are escaped, JS is disabled, and no network is allowed.
    const html = `<!doctype html><html lang="${document.language}" dir="${rtl ? "rtl" : "ltr"}"><head>
      <meta charset="utf-8"><meta http-equiv="Content-Security-Policy"
        content="default-src 'none'; style-src 'unsafe-inline'; font-src data:">
      <title>${escape(document.number)}</title><style>
      @font-face {font-family:Agreement;src:url(data:font/ttf;base64,${font.toString("base64")}) format('truetype')}
      @page {size:A4;margin:18mm} body {font:11pt Agreement;line-height:1.8;color:#172033}
      h1 {font-size:17pt;text-align:center;font-weight:normal;margin:0 0 20pt}
      .terms {white-space:pre-wrap;overflow-wrap:anywhere;unicode-bidi:plaintext}
      .record {break-before:page} .record h1 {text-align:${rtl ? "right" : "left"}}
      .consent,.signer {white-space:pre-wrap;overflow-wrap:anywhere}
      .audit {direction:ltr;text-align:left;unicode-bidi:isolate;overflow-wrap:anywhere;font-size:9pt}
      .evidence {break-inside:avoid;margin-top:18pt} svg {width:100%;height:130pt;border:1px solid #cbd5e1}
      polyline {fill:none;stroke:#172554;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}
      </style></head><body><h1>${escape(document.number)}</h1>
      <div class="terms">${escape(document.terms)}</div>
      <section class="record"><h1>${titles[document.language]}</h1>
      <p class="consent">${escape(evidence.consent)}</p><p class="signer">${escape(evidence.signerName)}</p>
      <div class="audit">${escape(evidence.email)}<br>
      Signed (UTC): ${evidence.signedAt.toISOString()}<br>
      Read confirmation (UTC): ${evidence.readAt.toISOString()}<br>
      Agreement SHA-256: ${escape(document.versionHash)}<br>Signature ID: ${escape(evidence.id)}</div>
      <div class="evidence"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 180">${svg}</svg>
      <p class="audit">Verification: authenticated customer account + one-time email code.</p></div>
      </section></body></html>`;
    browser = await puppeteer.launch({ executablePath: await chromiumPath(), headless: true,
      args: ["--no-sandbox", "--disable-dev-shm-usage"], timeout: 20000 });
    const page = await browser.newPage();
    await page.setJavaScriptEnabled(false);
    await page.setRequestInterception(true);
    page.on("request", request => {
      if (/^(data:|about:)/.test(request.url())) void request.continue();
      else void request.abort();
    });
    await page.setContent(html, { waitUntil: "load", timeout: 20000 });
    return Buffer.from(await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true, timeout: 20000 }));
  } catch (error) {
    if (error instanceof SigningError) throw error;
    throw new SigningError("PDF_UNAVAILABLE", 503);
  } finally {
    await browser?.close().catch(() => {});
    rendering--;
  }
}
