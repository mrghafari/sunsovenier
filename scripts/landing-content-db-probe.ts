import assert from "node:assert/strict";
import {pool} from "../server/db";
import {readLandingContent,saveLandingContent,LandingConflictError} from "../server/landing-content-store";

const client=await pool.connect();
try{
  await client.query("BEGIN");
  await client.query("SELECT filename,original_name,mime_type,size,url,alt,section,is_active FROM image_assets LIMIT 0");
  const current=await readLandingContent(client);
  const candidate=structuredClone(current);
  candidate.edits.en={...candidate.edits.en,drum220:{title:"Rollback-only landing content probe"}};
  const saved=await saveLandingContent(candidate,client);
  assert.equal(saved.revision,current.revision+1);
  const read=await readLandingContent(client);
  assert.equal(read.edits.en?.drum220.title,"Rollback-only landing content probe");
  await assert.rejects(saveLandingContent(candidate,client),LandingConflictError);
  console.log("Real database read/save/conflict checks passed inside a rollback-only transaction.");
}finally{
  await client.query("ROLLBACK");
  client.release();
  await pool.end();
}
