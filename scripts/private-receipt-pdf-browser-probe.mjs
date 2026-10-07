import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import puppeteer from "puppeteer";
import PDFDocument from "pdfkit";

// Synthetic browser-only responses; neither app authentication nor real receipts are modified.
const base = `https://${process.env.REPLIT_DEV_DOMAIN}`;
const component = "/src/components/private-receipt-pdf.tsx";
const source = await (await fetch(base + component)).text();
const main = await (await fetch(base + "/src/main.tsx")).text();
const reactUrl = source.match(/from ["']([^"']*\/react\.js[^"']*)["']/)?.[1];
const domUrl = main.match(/from ["']([^"']*react-dom_client[^"']*)["']/)?.[1];
assert.ok(reactUrl && domUrl);
const pdf = await new Promise(resolve => {
  const doc = new PDFDocument({ size: [320, 440] }), chunks = [];
  doc.on("data", chunk => chunks.push(chunk));
  doc.on("end", () => resolve(Buffer.concat(chunks)));
  doc.rect(35, 40, 180, 65).fill("#124c88").fillColor("black").text("Synthetic bank receipt", 35, 125);
  doc.addPage().rect(35, 40, 180, 65).fill("#16844a").fillColor("black").text("Second receipt page", 35, 125);
  doc.end();
});
const browser = await puppeteer.launch({
  executablePath: execFileSync("bash", ["-c", "command -v chromium || command -v chromium-browser"], { encoding: "utf8" }).trim(),
  headless: true, args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage(), errors = [];
  let status = 200, receiptReads = 0, cookieSent = false;
  page.on("pageerror", e => errors.push(e.message));
  await page.setRequestInterception(true);
  page.on("request", req => {
    const url = new URL(req.url());
    if (url.pathname === "/__receipt-canvas-probe") {
      return req.respond({ contentType: "text/html", body: '<iframe id="host" sandbox="allow-scripts allow-same-origin" src="/__receipt-canvas-child" style="width:100%;height:650px"></iframe>' });
    }
    if (url.pathname === "/__receipt-canvas-child") {
      return req.respond({ contentType: "text/html", body: `<div id="probe" style="height:600px"></div><script type="module">
        import RefreshRuntime from "/@react-refresh";
        RefreshRuntime.injectIntoGlobalHook(window);
        window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;
        window.__vite_plugin_react_preamble_installed__=true;
        const reactModule=await import(${JSON.stringify(reactUrl)});
        const React=reactModule.default||reactModule;
        const dom=await import(${JSON.stringify(domUrl)});
        const createRoot=dom.createRoot||dom.default.createRoot;
        const {PrivateReceiptPdf:Viewer}=await import(${JSON.stringify(component)});
        document.cookie="receiptProbe=synthetic; path=/; SameSite=Lax";
        const root=createRoot(document.getElementById("probe"));
        window.mountReceipt=(props={})=>root.render(React.createElement(Viewer,{
          src:"/files/bank-receipts/123/123456789-0123456789abcdef.pdf",
          title:"Synthetic receipt",language:"en",...props
        }));
        window.mountReceipt();
      </script>` });
    }
    if (url.pathname === "/files/bank-receipts/123/123456789-0123456789abcdef.pdf") {
      receiptReads++;
      cookieSent ||= (req.headers().cookie || "").includes("receiptProbe=synthetic");
      return req.respond({ status, contentType: status === 200 ? "application/pdf" : "application/json",
        headers: { "Cache-Control": "private, no-store" }, body: status === 200 ? pdf : '{"success":false}' });
    }
    return req.continue();
  });
  await page.goto(base + "/__receipt-canvas-probe", { waitUntil: "networkidle0" });
  const frame = await (await page.$("#host")).contentFrame();
  const waitForRendered = () => frame.waitForFunction(() => {
    const c = document.querySelector("canvas");
    return c?.width > 0 && c.style.display === "block";
  });
  await waitForRendered();
  assert.equal(await frame.$$eval("iframe,object,embed", nodes => nodes.length), 0);
  assert.ok(cookieSent, "Private fetch preserves the session cookie");
  assert.equal(await frame.$eval("canvas", c => c.getContext("2d").getImageData(60, 70, 1, 1).data[3]), 255);
  const initial = await frame.$eval("canvas", c => ({ width: c.width, height: c.height }));
  await frame.evaluate(() => [...document.querySelectorAll("button")].find(n => n.textContent === "Next page").click());
  await frame.waitForFunction(() => document.querySelector("canvas").getAttribute("aria-label").endsWith("Page 2"));
  await waitForRendered();
  await frame.evaluate(() => window.mountReceipt({ zoom: 2, rotation: 90 }));
  await frame.waitForFunction(({width,height}) => {
    const c = document.querySelector("canvas");
    return c.width === height * 2 && c.height === width * 2 && c.style.display === "block";
  }, {}, initial);
  for (const language of ["fa", "ar", "tr"]) {
    await frame.evaluate(language => window.mountReceipt({ language }), language);
    await waitForRendered();
    assert.ok(await frame.$eval("canvas", c => c.getAttribute("aria-label")));
  }
  status = 401;
  await frame.evaluate(() => window.mountReceipt({ key: "unauthorized" }));
  await frame.waitForSelector('[role="alert"]');
  assert.equal(await frame.$eval("canvas", c => c.style.display), "none");
  status = 200;
  await frame.evaluate(() => [...document.querySelectorAll("button")].find(n => n.textContent === "Retry").click());
  await waitForRendered();
  const readsBeforeExternal = receiptReads;
  await frame.evaluate(() => window.mountReceipt({ src: "https://example.invalid/private.pdf" }));
  await frame.waitForSelector('[role="alert"]');
  assert.equal(receiptReads, readsBeforeExternal);
  assert.equal(await frame.$$eval('a[target="_blank"]', nodes => nodes.length), 0);
  assert.deepEqual(errors, []);
  console.log("Private receipt PDF: sandboxed Chrome canvas rendering, two pages, zoom/rotation, four languages, session cookie, 401/retry, and external-origin rejection passed.");
} finally { await browser.close(); }
