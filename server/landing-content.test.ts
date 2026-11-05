import assert from "node:assert/strict";
import {test} from "node:test";
import {defaultLandingContent,landingContentSchema} from "../shared/landing-content";
import {readLandingContent,saveLandingContent,LandingConflictError,type LandingDatabase} from "./landing-content-store";
import manifest from "../client/src/pages/landing/landing-assets.json";

function database(initial?:unknown,knownImages:string[]=[]):LandingDatabase{
  let stored=initial===undefined?undefined:JSON.stringify(initial);
  return {async query(sql,values=[]){
    if(sql.startsWith("SELECT url"))return {rows:knownImages.map(url=>({url}))};
    if(sql.startsWith("SELECT setting_value"))return {rows:stored===undefined?[]:[{setting_value:stored}]};
    if(sql.startsWith("INSERT INTO shop_settings")){
      stored??=String(values[1]);return {rows:[]};
    }
    if(sql.startsWith("UPDATE shop_settings")){
      if(JSON.parse(stored!).revision!==values[2])return {rows:[]};
      stored=String(values[0]);return {rows:[{setting_value:stored}]};
    }
    throw new Error("Unexpected query");
  }};
}

test("unconfigured landing has source defaults; corrupted persisted data fails explicitly",async()=>{
  assert.deepEqual(await readLandingContent(database()),defaultLandingContent());
  await assert.rejects(readLandingContent(database({revision:1,images:"invalid"})));
});
test("shared content saves and can be read by another request with an incremented revision",async()=>{
  const db=database();
  const input=defaultLandingContent();
  input.images.about=manifest.images[3].url;
  input.edits.fa={drum220:{title:"عنوان مشترک"}};
  const saved=await saveLandingContent(input,db);
  assert.equal(saved.revision,1);
  const read=await readLandingContent(db);
  assert.equal(read.edits.fa?.drum220.title,"عنوان مشترک");
  assert.equal(read.images.about,manifest.images[3].url);
});
test("stale saves never overwrite newer content",async()=>{
  const db=database();
  const initial=defaultLandingContent();
  const saved=await saveLandingContent(initial,db);
  await assert.rejects(saveLandingContent(initial,db),LandingConflictError);
  assert.deepEqual(await readLandingContent(db),saved);
});
test("only actual registered landing uploads may be assigned to public image slots",async()=>{
  const input=defaultLandingContent();
  input.images.about=`/api/landing-media/${"a".repeat(64)}.png`;
  await assert.rejects(saveLandingContent(input,database()),/not been uploaded/);
  assert.equal((await saveLandingContent(input,database(undefined,[input.images.about]))).images.about,input.images.about);
});
test("reject external/script image URLs, unknown slots, duplicate cards and unknown packages",()=>{
  for(const url of ["javascript:alert(1)","https://external.test/image.png","data:image/png;base64,a","/api/landing-media/../../private.pdf"]){
    assert.equal(landingContentSchema.safeParse({...defaultLandingContent(),images:{about:url}}).success,false);
  }
  assert.equal(landingContentSchema.safeParse({...defaultLandingContent(),images:{unknown:manifest.images[0].url}}).success,false);
  const custom={id:"custom-test",title:"Test",short:"",long:"",specs:[],pack:["bag25"],asset:9,categoryPath:"/contact",custom:true};
  assert.equal(landingContentSchema.safeParse({...defaultLandingContent(),custom:[custom,custom]}).success,false);
  assert.equal(landingContentSchema.safeParse({...defaultLandingContent(),custom:[{...custom,pack:["unsupported"]}]}).success,false);
});
test("removing a custom card also requires removing its image/text references",()=>{
  const content=defaultLandingContent();
  content.edits.en={"custom-removed":{title:"Orphan"}};
  assert.equal(landingContentSchema.safeParse(content).success,false);
});
