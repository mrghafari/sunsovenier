import { build } from "esbuild";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here=resolve(fileURLToPath(new URL(".",import.meta.url)));
const root=resolve(here,"../../../../../");
const temp=await mkdtemp(resolve(root,".tmp-accounting-inventory-behavior-"));
try{
  const entries=[
    ["inventory-document-api.test.ts","inventory-document-api.test.mjs"],
    ["inventory-document-workflow.test.ts","inventory-document-workflow.test.mjs"],
  ];
  const bundles=[];
  for(const [entry,name] of entries){
    const result=await build({absWorkingDir:root,entryPoints:[resolve(here,entry)],bundle:true,write:false,platform:"node",format:"esm",packages:"external",alias:{"@":resolve(root,"client/src"),"@shared":resolve(root,"shared")},logLevel:"silent"});
    const bundle=resolve(temp,name);
    await writeFile(bundle,result.outputFiles[0].contents);
    bundles.push(bundle);
  }
  const run=spawnSync(process.execPath,["--test",...bundles],{cwd:root,stdio:"inherit"});
  if(run.error)throw run.error;
  process.exitCode=run.status??1;
}finally{await rm(temp,{recursive:true,force:true});}
