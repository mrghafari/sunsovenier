const assert=require("node:assert/strict");
const {build}=require("esbuild");
const {execFileSync}=require("node:child_process");
const path=require("node:path");
const puppeteer=require("puppeteer");

// Isolated UI probe: synthetic responses only, no real login or financial writes.
(async()=>{
  const output=await build({
    stdin:{contents:`
      import React from "react";
      import {createRoot} from "react-dom/client";
      import {QueryClient,QueryClientProvider} from "@tanstack/react-query";
      import Reports from "./client/src/components/admin/accounting/customer-accounting-reports";
      let root;
      export function mount(language){
        window.reportLanguage=language;
        if(root)root.unmount();
        root=createRoot(document.getElementById("probe"));
        const client=new QueryClient({defaultOptions:{queries:{retry:false},mutations:{retry:false}}});
        root.render(<QueryClientProvider client={client}>
          <Reports companies={[{id:1,name:"Synthetic company"}]}/>
        </QueryClientProvider>);
      }
    `,resolveDir:process.cwd(),loader:"tsx"},
    bundle:true,write:false,format:"iife",globalName:"CustomerCodeProbe",platform:"browser",jsx:"automatic",
    define:{"process.env.NODE_ENV":'"production"'},
    alias:{"@":path.join(process.cwd(),"client/src"),"@shared":path.join(process.cwd(),"shared")},
    plugins:[{name:"probe-language",setup(b){
      b.onResolve({filter:/LanguageContext$/},()=>({path:"language",namespace:"probe-language"}));
      b.onLoad({filter:/.*/,namespace:"probe-language"},()=>({contents:
        'export function useLanguage(){return {language:window.reportLanguage,direction:["fa","ar"].includes(window.reportLanguage)?"rtl":"ltr"}}',loader:"js"}));
    }}],
  });
  const browser=await puppeteer.launch({executablePath:execFileSync("which",["chromium"],{encoding:"utf8"}).trim(),
    headless:true,args:["--no-sandbox"]});
  try{
    const page=await browser.newPage();
    await page.setContent('<html><body><main id="probe"></main></body></html>');
    await page.addScriptTag({content:output.outputFiles[0].text});
    async function mount(language){
      await page.evaluate(language=>{
        window.reportCalls=[];
        window.fetch=async(url,options={})=>{
          if(options.method&&options.method!=="GET")throw new Error("No financial writes in this probe");
          const parsed=new URL(String(url),"https://probe.invalid");
          if(!parsed.pathname.startsWith("/api/accounting/v2/"))throw new Error("Unexpected probe request");
          window.reportCalls.push({path:parsed.pathname,query:Object.fromEntries(parsed.searchParams)});
          if(parsed.pathname.endsWith("/csv"))return new Response("customerCode\n9300006",{headers:{"Content-Type":"text/csv"}});
          if(parsed.pathname.includes("/customer-reports/"))return new Response(JSON.stringify({
            report:parsed.pathname.split("/").pop(),filters:Object.fromEntries(parsed.searchParams),
            company:{id:1,name:"Synthetic company",baseCurrency:"IQD"},
            customer:{id:8,code:"9300006",name:"Synthetic customer"},
            coverage:{postedEntryCount:0,receivableAccountCount:1,walletCutoverReady:true,receiptCutoverReady:true,legacyOpeningVerified:false},
            rows:[],balances:[],agingSummaries:[],pagination:{page:1,pageSize:50,totalRows:0},
          }),{headers:{"Content-Type":"application/json"}});
          return new Response("[]",{headers:{"Content-Type":"application/json"}});
        };
        window.CustomerCodeProbe.mount(language);
      },language);
      await page.waitForSelector('input[inputmode="numeric"]');
      await page.select("form select","1");
    }
    for(const language of ["fa","ar","en","tr"]){
      const alphabet=language==="fa"?"۰۱۲۳۴۵۶۷۸۹":language==="ar"?"٠١٢٣٤٥٦٧٨٩":"0123456789";
      const code="9300006".replace(/\d/g,d=>alphabet[Number(d)]);
      await mount(language);
      await page.type('input[inputmode="numeric"]',code);
      await page.click('button[type="submit"]');
      await page.waitForFunction(()=>window.reportCalls.some(c=>c.path.endsWith("/customer-statement")),{timeout:5000})
        .catch(async error=>{
          console.error(await page.evaluate(()=>({language:window.reportLanguage,calls:window.reportCalls,
            customer:document.querySelector('input[inputmode="numeric"]')?.value,
            company:document.querySelector("form select")?.value,
            alerts:[...document.querySelectorAll('[role="alert"]')].map(n=>n.textContent)})));
          throw error;
        });
      const request=await page.evaluate(()=>window.reportCalls.find(c=>c.path.endsWith("/customer-statement")));
      assert.equal(request.query.customerCode,"9300006");
      assert.equal(request.query.customerId,undefined);
      await page.waitForFunction(()=>document.querySelector("main").textContent.includes("Synthetic customer"));
      await page.click('button[role="tab"]:nth-child(2)');
      await page.click('button[type="submit"]');
      await page.waitForFunction(()=>window.reportCalls.some(c=>c.path.endsWith("/receivables-aging")));
      const aging=await page.evaluate(()=>window.reportCalls.find(c=>c.path.endsWith("/receivables-aging")));
      assert.equal(aging.query.customerCode,"9300006");
      assert.equal(aging.query.customerId,undefined);
      console.log(`PASS ${language}: statement and aging submit the customer business number`);
    }
    await mount("fa");
    await page.type('input[inputmode="numeric"]',"8");
    await page.click('button[type="submit"]');
    await page.waitForSelector('[role="alert"]');
    assert.equal(await page.evaluate(()=>window.reportCalls.some(c=>c.path.includes("/customer-reports/"))),false);
    console.log("PASS: internal CRM ID cannot be mistaken for a business customer number");
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
