import test from "node:test";
import assert from "node:assert/strict";
import {pool} from "./db";
import {readSiteLanguageSettings,saveSiteLanguageSettings} from "./site-language-settings";
import {defaultSiteLanguageSettings as defaults} from "@shared/site-language-settings";

test("initial language policy persists and legacy updates retain it (rollback-only)",{skip:process.env.SITE_LANGUAGE_DB_TEST!=="1"},async()=>{
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    await saveSiteLanguageSettings({...defaults,initialLanguageMode:"fixed",defaultLanguage:"fa"},client);
    assert.deepEqual(await readSiteLanguageSettings(client),{...defaults,initialLanguageMode:"fixed",defaultLanguage:"fa"});
    const {initialLanguageMode,defaultLanguage,...legacy}=defaults;
    await saveSiteLanguageSettings(legacy,client);
    assert.equal((await readSiteLanguageSettings(client)).defaultLanguage,"fa");
    assert.equal((await readSiteLanguageSettings(client)).initialLanguageMode,"fixed");
    await saveSiteLanguageSettings({...defaults,initialLanguageMode:"ip",defaultLanguage:"ar"},client);
    assert.equal((await readSiteLanguageSettings(client)).initialLanguageMode,"ip");
    assert.equal((await readSiteLanguageSettings(client)).defaultLanguage,"ar");
    await assert.rejects(()=>saveSiteLanguageSettings({...defaults,defaultLanguage:"ar",ar:false},client));
    assert.equal((await readSiteLanguageSettings(client)).defaultLanguage,"ar");
  }finally{await client.query("ROLLBACK");client.release();await pool.end();}
});
