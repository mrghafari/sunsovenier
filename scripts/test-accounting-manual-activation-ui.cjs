const assert=require("node:assert/strict");
const {build}=require("esbuild");
const {execFileSync}=require("node:child_process");
const path=require("node:path");
const puppeteer=require("puppeteer");

// Detached synthetic browser probe. No application login or real financial API is bypassed.
(async()=>{
  const output=await build({
    stdin:{contents:`
      import React from "react";
      import {createRoot} from "react-dom/client";
      import {QueryClient,QueryClientProvider} from "@tanstack/react-query";
      import Panel from "./client/src/components/admin/accounting/accounting-manual-activation";
      let root;
      export function mount(props){
        if(root)root.unmount();
        document.getElementById("probe").replaceChildren();
        root=createRoot(document.getElementById("probe"));
        const client=new QueryClient({defaultOptions:{queries:{retry:false},mutations:{retry:false}}});
        root.render(<QueryClientProvider client={client}><Panel {...props}/></QueryClientProvider>);
      }
    `,resolveDir:process.cwd(),loader:"tsx"},
    bundle:true,write:false,format:"iife",globalName:"ManualActivationProbe",
    platform:"browser",jsx:"automatic",define:{"process.env.NODE_ENV":'"production"'},
    alias:{"@":path.join(process.cwd(),"client/src")},
  });
  const browser=await puppeteer.launch({executablePath:execFileSync("which",["chromium"],{encoding:"utf8"}).trim(),
    headless:true,args:["--no-sandbox"]});
  try{
    const page=await browser.newPage();
    await page.setContent('<html><body><main id="probe"></main></body></html>');
    await page.addScriptTag({content:output.outputFiles[0].text});
    async function mount(props,options={}){
      await page.evaluate(({props,options})=>{
        window.approvalCalls=[];
        window.approvalState={companyId:props.companyId,baseCurrency:"IQD",
          approved:!!options.approved,enabled:!!options.approved,canActivate:options.canActivate!==false};
        window.fetch=async(url,init={})=>{
          if(!String(url).startsWith("/api/accounting/v2/manual-activation"))
            throw new Error("Only synthetic activation requests are allowed");
          window.approvalCalls.push({url,method:init.method||"GET",body:init.body&&JSON.parse(init.body)});
          if(options.unauthorized)return new Response("Unauthorized",{status:401});
          if(init.method==="POST"){
            window.approvalState={...window.approvalState,approved:true,enabled:true};
          }
          const state={...window.approvalState,...(options.wrongCompany?{companyId:9009}:{})};
          return new Response(JSON.stringify(state),{status:200,headers:{"Content-Type":"application/json"}});
        };
        window.ManualActivationProbe.mount(props);
      },{props,options});
    }
    for(const language of ["fa","ar","en","tr"]){
      await mount({companyId:9001,language,canManage:true});
      await page.waitForSelector("textarea");
      assert.equal(await page.$eval("button",b=>b.disabled),true);
      await page.type("textarea","Synthetic manager approval reference");
      assert.equal(await page.$eval("button",b=>b.disabled),true);
      await page.click('input[type="checkbox"]');
      assert.equal(await page.$eval("button",b=>b.disabled),false);
      await page.click("button");
      await page.waitForFunction(()=>window.approvalCalls.filter(c=>c.method==="POST").length===1
        &&document.querySelector("textarea")===null);
      const body=await page.evaluate(()=>window.approvalCalls.find(c=>c.method==="POST").body);
      assert.equal(body.companyId,9001);
      assert.equal(body.preserveLegacyConfirmed,true);
      assert.equal(body.baseCurrencyOnlyConfirmed,true);
      assert.equal(await page.$eval('[role="status"]',n=>n.textContent.includes("IQD")),true);
      console.log(`PASS ${language}: real component requires reason and explicit confirmation`);
      await mount({companyId:9002,language,canManage:false});
      await page.waitForFunction(()=>window.approvalCalls.length>0
        &&document.querySelector('[role="status"]')===null);
      assert.equal(await page.$("textarea"),null);
      assert.equal(await page.$('input[type="checkbox"]'),null);
      assert.equal(await page.evaluate(()=>window.approvalCalls.some(c=>c.method==="POST")),false);
    }
    for(const options of [{unauthorized:true},{wrongCompany:true}]){
      await mount({companyId:9001,language:"fa",canManage:true},options);
      await page.waitForSelector('[role="alert"]');
      assert.equal(await page.$("textarea"),null);
      assert.equal(await page.$('input[type="checkbox"]'),null);
    }
    console.log("PASS: unauthorized and wrong-company responses cannot unlock activation");
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
