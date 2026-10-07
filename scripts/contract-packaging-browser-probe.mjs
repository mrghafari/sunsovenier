import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import puppeteer from "puppeteer";

// Isolated component probe in this test browser, not an application auth bypass.
const base=`https://${process.env.REPLIT_DEV_DOMAIN}`;
const component="/src/components/contract-packaging-fields.tsx";
const source=await (await fetch(base+component)).text();
const main=await (await fetch(base+"/src/main.tsx")).text();
const reactUrl=source.match(/from ["']([^"']*\/react\.js[^"']*)["']/)?.[1];
const domUrl=main.match(/from ["']([^"']*react-dom_client[^"']*)["']/)?.[1];
assert.ok(reactUrl && domUrl);
const browser=await puppeteer.launch({
  executablePath:execFileSync("bash",["-c","command -v chromium || command -v chromium-browser"],{encoding:"utf8"}).trim(),
  headless:true,args:["--no-sandbox"],
});
try{
  const page=await browser.newPage(),errors=[];
  page.on("pageerror",e=>errors.push(e.message));
  await page.setRequestInterception(true);
  page.on("request",req=>{
    if(new URL(req.url()).pathname!=="/__contract-packaging-probe")return req.continue();
    return req.respond({contentType:"text/html",body:`<div id="probe"></div><script type="module">
      import RefreshRuntime from "/@react-refresh";
      RefreshRuntime.injectIntoGlobalHook(window);
      window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;
      window.__vite_plugin_react_preamble_installed__=true;
      const reactModule=await import(${JSON.stringify(reactUrl)});
      const React=reactModule.default||reactModule;
      const dom=await import(${JSON.stringify(domUrl)});
      const createRoot=dom.createRoot||dom.default.createRoot;
      const {ContractPackagingFields:Field}=await import(${JSON.stringify(component)});
      const root=createRoot(document.getElementById("probe"));
      function Host({language}){
        const [value,setValue]=React.useState(null);
        window.packagingProbeValue=value;
        return React.createElement(Field,{language,value,onChange:setValue});
      }
      window.mountPackaging=language=>root.render(React.createElement(Host,{key:language,language}));
      window.mountPackaging("en");
    </script>`});
  });
  await page.goto(base+"/__contract-packaging-probe",{waitUntil:"networkidle0"});
  await page.waitForSelector('input[type="checkbox"]');
  await page.click('input[type="checkbox"]');
  await page.waitForSelector('[role="combobox"]');
  await page.click('[role="combobox"]');
  await page.waitForSelector('[role="option"]');
  assert.equal(await page.$$eval('[role="option"]',nodes=>nodes.length),7);
  await page.evaluate(()=>[...document.querySelectorAll('[role="option"]')].find(n=>n.textContent==="Drum").click());
  await page.waitForFunction(()=>window.packagingProbeValue?.type==="drum");
  const inputs=await page.$$('input[type="number"]');
  for(const [input,value] of [[inputs[0],"12000"],[inputs[1],"9.25"]]){
    await input.click({clickCount:3});await input.type(value);
  }
  await page.waitForFunction(()=>window.packagingProbeValue?.costPerTonne===12000&&window.packagingProbeValue?.vatRatePercent===9.25);
  await page.click('input[type="checkbox"]');
  await page.waitForFunction(()=>window.packagingProbeValue===null);
  for(const language of ["fa","ar","tr"]){
    await page.evaluate(lang=>window.mountPackaging(lang),language);
    await page.waitForSelector('input[type="checkbox"]');
    await page.click('input[type="checkbox"]');
    await page.waitForSelector('input[type="number"]');
  }
  assert.deepEqual(errors,[]);
  console.log("Real Radix selection: 7 types, fee/VAT editing, null preservation, and four-language packaging editor passed.");
}finally{await browser.close();}
