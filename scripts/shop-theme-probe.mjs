import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {mkdir} from "node:fs/promises";
import puppeteer from "puppeteer";

const base=`https://${process.env.REPLIT_DEV_DOMAIN}`;
const browser=await puppeteer.launch({
  executablePath:execFileSync("bash",["-c","command -v chromium || command -v chromium-browser"],{encoding:"utf8"}).trim(),
  headless:true,args:["--no-sandbox"],
});
const output="generated-artifacts/shop-theme";
await mkdir(output,{recursive:true});
try{
  const page=await browser.newPage();
  await page.setBypassServiceWorker(true);
  const errors=[];
  page.on("pageerror",error=>errors.push(error.message));
  await page.setViewport({width:1280,height:900});
  await page.evaluateOnNewDocument(()=>{
    localStorage.setItem("language","en");
    localStorage.setItem("language-manually-selected","true");
  });
  await page.goto(base+"/shop",{waitUntil:"domcontentloaded",timeout:60000});
  const toggle='[data-testid="shop-theme-toggle"]';
  await page.waitForFunction(()=>document.querySelector('[data-testid="shop-theme-toggle"]')?.getBoundingClientRect().width>0,{timeout:90000});
  await page.waitForSelector(".shop-storefront h1",{timeout:90000});
  assert.equal(await page.$eval(toggle,button=>button.getAttribute("aria-pressed")),"false");
  await page.hover(toggle);
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('[data-testid="shop-theme-toggle"]')).color==="rgb(0, 0, 0)",{timeout:10000});
  assert.equal(await page.$eval(toggle,button=>button.textContent.trim()),"","The theme control must use only an icon");
  const light=await page.$eval("main > div",element=>getComputedStyle(element).backgroundColor);
  await page.click(toggle);
  await page.waitForFunction(()=>document.documentElement.classList.contains("dark"));
  assert.equal(await page.$eval(toggle,button=>button.getAttribute("aria-pressed")),"true");
  const dark=await page.$eval("main > div",element=>getComputedStyle(element).backgroundColor);
  assert.notEqual(dark,light,"The shop background must actually change");
  assert.notEqual(await page.$eval(".shop-storefront > .bg-white",element=>getComputedStyle(element).backgroundColor),"rgb(255, 255, 255)","Catalog surfaces must not stay white at night");
  await page.screenshot({path:`${output}/night-desktop.png`});
  await page.reload({waitUntil:"domcontentloaded",timeout:60000});
  await page.waitForFunction(()=>document.querySelector('[data-testid="shop-theme-toggle"]')?.getBoundingClientRect().width>0,{timeout:60000});
  await page.waitForSelector(".shop-storefront h1",{timeout:90000});
  assert.equal(await page.$eval(toggle,button=>button.getAttribute("aria-pressed")),"true");
  await page.click('header a[href="/"]');
  await page.waitForSelector(".mc-landing",{timeout:60000});
  assert.equal(await page.evaluate(()=>document.documentElement.classList.contains("dark")),false,"Shop preference must not leak to landing/admin");
  await page.click('.mc-nav-links a[href="/shop"]');
  await page.waitForFunction(()=>document.querySelector('[data-testid="shop-theme-toggle"]')?.getBoundingClientRect().width>0,{timeout:60000});
  await page.waitForSelector(".shop-storefront h1",{timeout:90000});
  assert.equal(await page.$eval(toggle,button=>button.getAttribute("aria-pressed")),"true");
  await page.setViewport({width:390,height:844});
  assert.ok(await page.$eval(toggle,element=>{const rect=element.getBoundingClientRect();return rect.width>0&&rect.right<=innerWidth&&rect.left>=0;}));
  await page.screenshot({path:`${output}/night-mobile.png`});
  await page.click(toggle);
  await page.waitForFunction(()=>!document.documentElement.classList.contains("dark"));
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('[data-testid="shop-theme-toggle"]')).color==="rgb(0, 0, 0)",{timeout:10000});
  const banner=await page.evaluate(()=>{
    const heading=[...document.querySelectorAll(".shop-storefront h3")].find(element=>element.textContent.includes("MAXIMIZE YOUR SAVINGS"));
    const panel=heading?.closest(".bg-gradient-to-r");
    return panel?{classes:panel.className,background:getComputedStyle(panel).backgroundImage}:null;
  });
  if(banner){
    assert.ok(!/from-purple-600|via-pink-600|to-red-600/.test(banner.classes),"The discount banner must no longer use the old red/pink gradient");
    assert.ok(banner.background.includes("gradient"),"Preserve the branded gradient treatment");
  }
  await page.screenshot({path:`${output}/day-mobile.png`});
  assert.equal(await page.$eval(toggle,button=>button.getAttribute("aria-pressed")),"false");
  assert.deepEqual(errors,[]);
  console.log("Storefront theme checks passed: actual day/night colors and catalog surfaces, reload persistence, SPA route isolation, return-to-shop preference and mobile toggle visibility. No business data was changed.");
}finally{await browser.close();}
