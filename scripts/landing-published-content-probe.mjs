import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {readFile} from "node:fs/promises";
import puppeteer from "puppeteer";

const base=`https://${process.env.REPLIT_DEV_DOMAIN}`;
const manifest=JSON.parse(await readFile("client/src/pages/landing/landing-assets.json","utf8"));
const browser=await puppeteer.launch({
  executablePath:execFileSync("bash",["-c","command -v chromium || command -v chromium-browser"],{encoding:"utf8"}).trim(),
  headless:true,args:["--no-sandbox"],
});
try{
  const page=await browser.newPage();
  await page.evaluateOnNewDocument(()=>{
    localStorage.setItem("language","en");
    localStorage.setItem("language-manually-selected","true");
  });
  await page.setViewport({width:390,height:844});
  await page.goto(base+"/",{waitUntil:"domcontentloaded",timeout:60000});
  await page.waitForFunction(()=>document.querySelectorAll(".mc-brand-logo").length===2&&[...document.querySelectorAll(".mc-brand-logo")].every(img=>img.complete&&img.naturalWidth>0),{timeout:60000});
  assert.equal(await page.$(".mc-manager"),null);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:"generated-artifacts/landing-verification/company-logo-mobile.png"});
  // Fixture only in this browser: no actual site content is changed.
  await page.setRequestInterception(true);
  page.on("request",request=>{
    if(new URL(request.url()).pathname==="/api/landing-content"){
      return request.respond({contentType:"application/json",body:JSON.stringify({success:true,data:{
        revision:7,images:{about:manifest.images[8].url},
        edits:{en:{drum220:{title:"Shared landing content probe"}},fa:{},ar:{},tr:{}},custom:[],
      }})});
    }
    return request.continue();
  });
  await page.reload({waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.querySelector(".mc-service-card")?.textContent.includes("Shared landing content probe"),{timeout:60000});
  assert.equal(await page.$eval(".mc-about-image img",img=>new URL(img.src).pathname),manifest.images[8].url);
  assert.equal(await page.$(".mc-manager"),null,"Public API content must not depend on an admin session");
  console.log("Company logos render in both brand links on mobile. Anonymous homepage uses shared API text and images without an inline settings panel. Public-content changes were browser fixtures only.");
}finally{await browser.close();}
