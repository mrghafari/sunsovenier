import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import puppeteer from "puppeteer";

const base=`https://${process.env.REPLIT_DEV_DOMAIN}`;
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
  await page.goto(base+"/",{waitUntil:"domcontentloaded",timeout:60000});
  await page.waitForSelector(".mc-service-card button",{timeout:60000});
  await page.$eval(".mc-service-card button",button=>button.click());
  await page.waitForSelector("dialog[open]");
  assert.equal(await page.$eval("#mc-modal-title",el=>el.textContent),"220L Standard Drums");
  assert.equal(await page.$$(".mc-specs li").then(elements=>elements.length),4);
  assert.equal(await page.$$(".mc-pack").then(elements=>elements.length),3);
  await page.$$eval(".mc-pack",buttons=>buttons.find(button=>!button.disabled).click());
  await page.waitForFunction(()=>document.querySelector("#mc-modal-title").textContent==="1000L IBC Containers");
  await page.$eval(".mc-modal-body > .mc-button",button=>button.click());
  await page.waitForFunction(()=>!document.querySelector("dialog").open);
  assert.equal(await page.$eval("[name=productInterest]",select=>select.value),"ibc1000");

  // Isolated Chromium storage, not the user's browser or shared application data.
  await page.evaluate(async()=>{
    const editor=await import("/src/pages/landing/local-editor.ts");
    const state={images:{},edits:{drum220:{title:"Isolated storage probe"}},custom:[]};
    await editor.writeLocalLanding(state);
  });
  await page.reload({waitUntil:"domcontentloaded"});
  const saved=await page.evaluate(async()=>{
    const editor=await import("/src/pages/landing/local-editor.ts");
    return editor.readLocalLanding();
  });
  assert.equal(saved.edits.drum220.title,"Isolated storage probe");
  assert.equal(await page.$(".mc-manager"),null);
  console.log("Product details, specification list, packaging navigation, quote selection and isolated IndexedDB persistence checks passed. No server data changed.");
}finally{await browser.close();}
