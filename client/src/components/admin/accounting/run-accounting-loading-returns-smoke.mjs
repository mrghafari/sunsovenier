import {build} from "esbuild";
import {mkdtemp,writeFile,rm} from "node:fs/promises";
import {spawnSync} from "node:child_process";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
const here=resolve(fileURLToPath(new URL(".",import.meta.url)));
const root=resolve(here,"../../../../../");
const temp=await mkdtemp(resolve(root,".tmp-accounting-loading-returns-"));
try{
  for(const name of ["accounting-loading-returns-api.test.ts","accounting-loading-returns-ssr.test.tsx","accounting-loading-invoices.test.ts"]){
    const result=await build({absWorkingDir:root,entryPoints:[resolve(here,name)],bundle:true,write:false,
      platform:"node",format:"esm",jsx:"automatic",packages:"external",
      alias:{"@":resolve(root,"client/src"),"@shared":resolve(root,"shared")},logLevel:"silent"});
    const bundle=resolve(temp,name+".mjs");await writeFile(bundle,result.outputFiles[0].contents);
    const run=spawnSync(process.execPath,["--test",bundle],{cwd:root,stdio:"inherit"});
    if(run.error)throw run.error;
    if(run.status!==0){process.exitCode=run.status??1;break;}
  }
}finally{await rm(temp,{recursive:true,force:true});}
