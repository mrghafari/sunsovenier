import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {readFile} from "node:fs/promises";
import puppeteer from "puppeteer";

const base=`https://${process.env.REPLIT_DEV_DOMAIN}`;
const component="/src/components/admin/content/LandingPageEditor.tsx";
const source=await(await fetch(base+component)).text();
const main=await(await fetch(base+"/src/main.tsx")).text();
const reactUrl=source.match(/from ["']([^"']*\/react\.js[^"']*)["']/)?.[1];
const queryUrl=source.match(/from ["']([^"']*react-query[^"']*)["']/)?.[1];
const domUrl=main.match(/from ["']([^"']*react-dom_client[^"']*)["']/)?.[1];
assert.ok(reactUrl&&queryUrl&&domUrl,"Resolve the actual Vite modules");
const manifest=JSON.parse(await readFile("client/src/pages/landing/landing-assets.json","utf8"));
let state={revision:0,images:{},edits:{en:{},fa:{},ar:{},tr:{}},custom:[]};
let conflict=false,uploads=0,saves=0;
const uploadedUrl=`/api/landing-media/${"a".repeat(64)}.png`;
const browser=await puppeteer.launch({
  executablePath:execFileSync("bash",["-c","command -v chromium || command -v chromium-browser"],{encoding:"utf8"}).trim(),
  headless:true,args:["--no-sandbox"],
});
try{
  const page=await browser.newPage();
  const errors=[];
  page.on("pageerror",error=>errors.push(error.message));
  page.on("dialog",dialog=>dialog.accept());
  await page.setRequestInterception(true);
  page.on("request",request=>{
    const url=new URL(request.url());
    if(url.pathname==="/__landing-editor-component-probe"){
      return request.respond({contentType:"text/html",body:`<div id="probe"></div><script type="module">
        localStorage.setItem("language","en");localStorage.setItem("language-manually-selected","true");
        import RefreshRuntime from "/@react-refresh";
        RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;
        await import("/src/index.css");
        const rm=await import(${JSON.stringify(reactUrl)});const React=rm.default||rm;
        const dm=await import(${JSON.stringify(domUrl)});const createRoot=dm.createRoot||dm.default.createRoot;
        const {QueryClient,QueryClientProvider}=await import(${JSON.stringify(queryUrl)});
        const {LanguageProvider}=await import("/src/contexts/LanguageContext.tsx");
        const Editor=(await import(${JSON.stringify(component)})).default;
        createRoot(document.getElementById("probe")).render(React.createElement(QueryClientProvider,{client:new QueryClient({defaultOptions:{queries:{retry:false}}})},React.createElement(LanguageProvider,null,React.createElement(Editor))));
      </script>`});
    }
    if(url.pathname==="/api/content-management/landing"){
      if(request.method()==="PUT"){
        if(conflict)return request.respond({status:409,contentType:"application/json",body:'{"success":false,"message":"Concurrent edit"}'});
        const incoming=JSON.parse(request.postData());
        assert.equal(incoming.revision,state.revision);
        state={...incoming,revision:incoming.revision+1};saves++;
      }
      return request.respond({contentType:"application/json",body:JSON.stringify({success:true,data:state})});
    }
    if(url.pathname==="/api/content-management/landing/images"){
      uploads++;
      return request.respond({status:201,contentType:"application/json",body:JSON.stringify({success:true,data:{url:uploadedUrl,width:1,height:1,bytes:68}})});
    }
    if(url.pathname===uploadedUrl){
      return request.respond({contentType:"image/png",body:Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a4YcAAAAASUVORK5CYII=","base64")});
    }
    return request.continue();
  });
  await page.goto(base+"/__landing-editor-component-probe",{waitUntil:"networkidle0",timeout:60000});
  await page.waitForSelector('input[type="file"]',{timeout:60000});
  async function setTitle(text,last=false){
    const inputs=await page.$$('input[placeholder="Title"]');
    assert.ok(inputs.length);
    const input=last?inputs.at(-1):inputs[0];
    await input.click();await page.keyboard.down("Control");await page.keyboard.press("A");await page.keyboard.up("Control");await input.type(text);
  }
  async function save(){
    const count=saves;
    await page.$eval("header button:last-child",button=>button.click());
    await page.waitForNetworkIdle({idleTime:300,timeout:15000});
    if(!conflict)assert.equal(saves,count+1);
  }
  await setTitle("Shared editor title probe");
  await save();
  assert.equal(state.edits.en.drum220.title,"Shared editor title probe");
  const imageInput=await page.$('input[type="file"]');
  await imageInput.uploadFile(`generated-artifacts/landing-assets/${manifest.images[0].filename}`);
  await page.waitForFunction(url=>document.querySelector(`img[src="${url}"]`)!==null,{},uploadedUrl);
  await save();assert.equal(uploads,1);assert.equal(state.images["hero-0"],uploadedUrl);
  await setTitle("Custom editor card probe",true);
  await page.click('input[type="checkbox"]');
  await page.$eval("button:has(svg[class*='plus'])",button=>button.click());
  await save();assert.equal(state.custom.length,1);
  await page.$eval("button:has(svg[class*='trash'])",button=>button.click());
  await save();assert.equal(state.custom.length,0);
  conflict=true;
  await setTitle("Keep unsaved conflict draft");
  await save();
  assert.equal(await page.$eval('input[placeholder="Title"]',input=>input.value),"Keep unsaved conflict draft");
  assert.deepEqual(errors,[]);
  console.log("Isolated editor checks passed: text save, image upload, custom create/delete and conflict draft retention. API responses were browser fixtures; no server auth bypass or live content changes.");
}finally{await browser.close();}
