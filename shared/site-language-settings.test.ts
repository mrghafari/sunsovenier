import test from "node:test";
import assert from "node:assert/strict";
import {defaultSiteLanguageSettings as defaults,languageForVisitorCountry,mergeSiteLanguageSettings,normalizeSiteLanguageSettings,siteLanguageSettingsUpdateSchema} from "./site-language-settings";
import {readManualSiteLanguage,resolveInitialSiteLanguage} from "../client/src/lib/site-language-preference";

test("legacy enabled maps retain IP behavior, with an enabled runtime fallback",()=>{
  assert.deepEqual(normalizeSiteLanguageSettings(null),defaults);
  const old=normalizeSiteLanguageSettings({en:false,ar:true,tr:false,fa:false,ku:true});
  assert.equal(old.initialLanguageMode,"ip");assert.equal(old.defaultLanguage,"ar");
  assert.equal(normalizeSiteLanguageSettings({en:false,ar:false,tr:false,fa:false,ku:true}).en,true);
});
test("fixed first language ignores all countries; IP mode detects only enabled languages and uses configured fallback",()=>{
  for(const code of ["en","ar","tr","fa"] as const){
    const fixed={...defaults,initialLanguageMode:"fixed" as const,defaultLanguage:code};
    for(const country of ["IR","IQ","TR","US",null])assert.equal(languageForVisitorCountry(fixed,country),code);
  }
  assert.equal(languageForVisitorCountry(defaults,"IR"),"fa");
  assert.equal(languageForVisitorCountry(defaults,"IQ"),"ar");
  assert.equal(languageForVisitorCountry(defaults,"tr"),"tr");
  const settings={...defaults,ar:false,defaultLanguage:"fa" as const};
  for(const country of ["IQ","US",null])assert.equal(languageForVisitorCountry(settings,country),"fa");
});
test("updates reject unknown modes, unsupported defaults, disabled defaults, false flag types and only legacy Kurdish",()=>{
  const invalid=[
    {...defaults,initialLanguageMode:"browser"},
    {...defaults,defaultLanguage:"ku"},
    {...defaults,defaultLanguage:"ar",ar:false},
    {...defaults,en:"false"},
    {...defaults,en:false,ar:false,tr:false,fa:false,ku:true},
    {...defaults,forceVisitorLanguage:true},
  ];
  for(const input of invalid)assert.throws(()=>mergeSiteLanguageSettings(defaults,input));
});
test("legacy clients preserve stored mode/default; disabled old defaults are repaired safely",()=>{
  const stored={...defaults,initialLanguageMode:"fixed" as const,defaultLanguage:"fa" as const};
  const {initialLanguageMode,defaultLanguage,...flags}=defaults;
  assert.equal(mergeSiteLanguageSettings(stored,flags).defaultLanguage,"fa");
  assert.equal(mergeSiteLanguageSettings(stored,flags).initialLanguageMode,"fixed");
  assert.equal(mergeSiteLanguageSettings(stored,{...flags,fa:false}).defaultLanguage,"en");
  assert.equal(siteLanguageSettingsUpdateSchema.safeParse({en:true}).success,false);
});
test("only explicit valid manual choices bypass initial detection; automatic cached languages do not",async()=>{
  const storage=(entries:Record<string,string>)=>({getItem:(key:string)=>entries[key]??null});
  for(const code of ["en","ar","tr","fa"] as const){
    const manual=readManualSiteLanguage(storage({language:code,"language-manually-selected":"true"}));
    assert.equal(await resolveInitialSiteLanguage(manual,async()=>{throw new Error("Must not geolocate manual choice");}),code);
  }
  for(const entries of [{language:"fa"},{language:"ku","language-manually-selected":"true"}]){
    assert.equal(readManualSiteLanguage(storage(entries)),null);
    assert.equal(await resolveInitialSiteLanguage(null,async()=>"ar"),"ar");
  }
  await assert.rejects(()=>resolveInitialSiteLanguage(null,async()=>"ku"));
  assert.equal(readManualSiteLanguage({getItem:()=>{throw new Error("storage unavailable");}}),null);
});
