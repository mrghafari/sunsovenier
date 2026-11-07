import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {mkdir} from "node:fs/promises";
import puppeteer from "puppeteer";

const base=`https://${process.env.REPLIT_DEV_DOMAIN}`;
const browser=await puppeteer.launch({
  executablePath:execFileSync("bash",["-c","command -v chromium || command -v chromium-browser"],{encoding:"utf8"}).trim(),
  headless:true,args:["--no-sandbox"],
});
try{
  const page=await browser.newPage();
  await page.setViewport({width:1280,height:900});
  await page.evaluateOnNewDocument(()=>{
    localStorage.setItem("language","en");
    localStorage.setItem("language-manually-selected","true");
  });
  const errors=[];
  const requests=[];
  let failContact=false;
  page.on("pageerror",error=>errors.push(error.message));
  await page.setRequestInterception(true);
  page.on("request",request=>{
    if(new URL(request.url()).pathname==="/api/landing-estimate"&&request.method()==="POST"){
      requests.push(JSON.parse(request.postData()));
      return request.respond({status:failContact?503:201,contentType:"application/json",
        body:JSON.stringify(failContact?{message:"Probe unavailable"}:{success:true})});
    }
    return request.continue();
  });
  await page.goto(base+"/",{waitUntil:"domcontentloaded",timeout:60000});
  await page.waitForSelector(".mc-service-card",{timeout:60000});
  await page.waitForFunction(()=>document.querySelectorAll(".mc-category-link").length>0);
  assert.equal(await page.$$(".mc-service-card").then(rows=>rows.length),6);
  assert.equal(await page.$(".mc-manager"),null,"Anonymous visitors must not see preview management");
  assert.equal(await page.$eval(".mc-logo",el=>getComputedStyle(el).color),"rgb(255, 255, 255)");
  assert.equal(await page.$eval(".mc-button-dark",el=>getComputedStyle(el).color),"rgb(255, 255, 255)");
  assert.equal(await page.$$eval("a[href^='file:']",links=>links.length),0);
  await page.emulateMediaFeatures([{name:"prefers-reduced-motion",value:"reduce"}]);
  for(const language of ["fa","ar","tr","en"]){
    await page.select(".mc-language select",language);
    await page.waitForFunction(lang=>document.querySelector(".mc-landing").dir===(["fa","ar"].includes(lang)?"rtl":"ltr"),{},language);
    assert.ok(await page.$eval("h1",el=>el.textContent.trim().length)>10);
  }
  const dot=await page.$(".mc-slide-dots button");
  await dot.click();
  await page.waitForFunction(()=>document.querySelector(".mc-slide-dots button").getAttribute("aria-pressed")==="true");
  await page.$eval(".mc-faq-item button",el=>el.click());
  assert.equal(await page.$eval(".mc-faq-item button",el=>el.getAttribute("aria-expanded")),"true");
  await page.$eval(".mc-faq-item button",el=>el.click());
  assert.equal(await page.$eval(".mc-faq-item button",el=>el.getAttribute("aria-expanded")),"false");
  await page.$eval(".mc-estimate-card form",form=>form.requestSubmit());
  assert.equal(requests.length,0,"Invalid form must not submit");
  async function fill(){
    await page.select("select[name=productInterest]","drum220");
    for(const [name,value] of Object.entries({fullName:"Probe",email:"landing-probe@example.invalid",phone:"+964000000000",address:"Synthetic address"})){
      await page.$eval(`[name=${name}]`,(input,value)=>{input.value=value;input.dispatchEvent(new Event("input",{bubbles:true}));},value);
    }
  }
  await fill();
  await page.$eval(".mc-estimate-card form",form=>form.requestSubmit());
  await page.waitForFunction(()=>document.querySelector(".mc-form-feedback.success"));
  assert.equal(requests[0].fullName,"Probe");
  assert.equal(requests[0].productInterest,"drum220");
  assert.equal(requests[0].phone,"+964000000000");
  assert.equal(requests[0].address,"Synthetic address");
  failContact=true;
  await fill();
  await page.$eval(".mc-estimate-card form",form=>form.requestSubmit());
  await page.waitForFunction(()=>document.querySelector(".mc-form-feedback.error")?.textContent.includes("couldn"));
  for(let position=0;position<await page.$eval("body",el=>el.scrollHeight);position+=600){
    await page.evaluate(y=>window.scrollTo({top:y,behavior:"instant"}),position);
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  await page.waitForFunction(()=>[...document.querySelectorAll(".mc-service-image img,.mc-about-image img")].every(img=>img.complete&&img.naturalWidth>0));
  await mkdir("generated-artifacts/landing-verification",{recursive:true});
  await page.evaluate(()=>window.scrollTo({top:0,behavior:"instant"}));
  await page.screenshot({path:"generated-artifacts/landing-verification/desktop.png",fullPage:true});
  await page.setViewport({width:390,height:844});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),"Mobile must not overflow horizontally");
  await page.click(".mc-menu-toggle");
  assert.equal(await page.$eval(".mc-menu-toggle",el=>el.getAttribute("aria-expanded")),"true");
  await page.screenshot({path:"generated-artifacts/landing-verification/mobile.png"});
  assert.deepEqual(errors,[]);
  console.log("Landing browser checks passed: source images, text contrast, 4 languages/RTL, slider, FAQ, contact validation/success/failure, anonymous management boundary and mobile layout. Contact responses were intercepted; no email/data was sent.");
}finally{await browser.close();}
