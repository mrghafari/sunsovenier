import {readFile,writeFile,mkdir} from "node:fs/promises";
import {createHash} from "node:crypto";
import {spawnSync} from "node:child_process";
import sharp from "sharp";

const source=await readFile("attached_assets/NEW111_1793469659038.html","utf8");
const directory="generated-artifacts/landing-assets";
await mkdir(directory,{recursive:true});
const images=[];
for(const [index,match] of [...source.matchAll(/data:([^;,]+);base64,([^"'\s>)]+)/g)].entries()){
  const original=Buffer.from(match[2],"base64");
  const metadata=await sharp(original).metadata();
  const webp=await sharp(original).webp({lossless:true,effort:6}).toBuffer();
  const jpeg=spawnSync("jpegtran",["-copy","all","-optimize","-progressive"],{input:original,maxBuffer:20*1024*1024});
  if(jpeg.status!==0)throw new Error("Lossless JPEG optimizer unavailable");
  let optimized=jpeg.stdout.length<original.length?jpeg.stdout:original;
  let extension="jpg";
  if(webp.length<optimized.length){optimized=webp;extension="webp";}
  // Decode and compare every channel, not a subjective quality score.
  const before=await sharp(original).raw().toBuffer();
  const after=await sharp(optimized).raw().toBuffer();
  if(!before.equals(after))throw new Error(`Image ${index}: lossless pixel verification failed`);
  const hash=createHash("sha256").update(optimized).digest("hex").slice(0,24);
  const filename=`${hash}.${extension}`;
  await writeFile(`${directory}/${filename}`,optimized);
  images.push({index,url:`/api/landing-assets/${filename}`,filename,width:metadata.width,height:metadata.height,
    bytes:optimized.length,originalBytes:original.length,pixelsIdentical:true,
    contentType:extension==="jpg"?"image/jpeg":"image/webp"});
}
const files=[];
const css=[];
async function storeFile(buffer,extension,contentType){
  const hash=createHash("sha256").update(buffer).digest("hex").slice(0,24);
  const filename=`${hash}.${extension}`;
  await writeFile(`${directory}/${filename}`,buffer);
  files.push({filename,url:`/api/landing-assets/${filename}`,bytes:buffer.length,contentType});
  return `/api/landing-assets/${filename}`;
}
async function download(url,headers={}){
  const response=await fetch(url,{headers});
  if(!response.ok)throw new Error(`Font/icon download failed: ${response.status}`);
  return response;
}
// Exact Font Awesome source outlines, only the glyphs used by this page.
// CSS masks avoid downloading an entire icon font for a handful of icons.
css.push("/* Font Awesome Free 6.7.2 icons: CC BY 4.0, https://fontawesome.com/license/free */");
css.push(".mc-landing .fa-solid,.mc-landing .fa-brands{display:inline-block;font-style:normal;line-height:1}");
css.push(".mc-landing .fa-solid::before,.mc-landing .fa-brands::before{content:'';display:inline-block;width:1em;height:1em;background-color:currentColor;mask:var(--mc-icon) center/contain no-repeat;-webkit-mask:var(--mc-icon) center/contain no-repeat;vertical-align:-.125em}");
for(const name of ["arrow-right","bars","boxes-stacked","chevron-down","flask","gear","globe","image","images",
  "industry","phone","plus","plus-circle","shield-halved","sliders","star","truck-fast","vial-circle-check","xmark","google"]){
  const family=name==="google"?"brands":"solid";
  const canonicalName=name==="plus-circle"?"circle-plus":name;
  let svg=await(await download(`https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.7.2/svgs/${family}/${canonicalName}.svg`)).text();
  svg=svg.replace(/<!--[\s\S]*?-->/g,"").replace(/\s+/g," ").trim();
  css.push(`.mc-landing .fa-${name}{--mc-icon:url("data:image/svg+xml,${encodeURIComponent(svg)}")}`);
}
// Restore the missing Google Fonts attachment and self-host the precise font.
const fontResponse=await download("https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap",{
  "User-Agent":"Mozilla/5.0 AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
});
let fontCss=await fontResponse.text();
const fontUrls=[...new Set([...fontCss.matchAll(/url\((https:\/\/[^)]+)\)/g)].map(m=>m[1]))];
for(const url of fontUrls){
  const buffer=Buffer.from(await(await download(url)).arrayBuffer());
  const route=await storeFile(buffer,"woff2","font/woff2");
  fontCss=fontCss.replaceAll(url,route);
}
css.push(fontCss);
await writeFile("client/src/pages/landing/landing-fonts.css",css.join("\n")+"\n");
const manifest={images,files,sourceBytes:Buffer.byteLength(source),totalImageBytes:images.reduce((n,i)=>n+i.bytes,0)};
await mkdir("client/src/pages/landing",{recursive:true});
await writeFile("client/src/pages/landing/landing-assets.json",JSON.stringify(manifest,null,2)+"\n");
console.log(JSON.stringify({images:images.length,sourceBytes:manifest.sourceBytes,totalImageBytes:manifest.totalImageBytes,
  reductionPercent:Math.round((1-manifest.totalImageBytes/manifest.sourceBytes)*100),pixelsIdentical:true}));
