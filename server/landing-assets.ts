import type {Express} from "express";
import {readFile} from "node:fs/promises";
import path from "node:path";
import {createHash} from "node:crypto";
import {getAwsS3Service} from "./aws-s3-service";
import manifest from "../client/src/pages/landing/landing-assets.json";

// Only explicitly published, content-addressed landing assets may be public.
// Never turn this endpoint into an arbitrary private-S3 key reader.
const assets=new Map([...manifest.images,...manifest.files].map(image=>[image.filename,image]));
const cache=new Map<string,Buffer>();
export function registerLandingAssets(app:Express){
  app.get("/api/landing-assets/:filename",async(req,res)=>{
    const image=assets.get(req.params.filename);
    if(!image){res.status(404).json({message:"Landing asset not found"});return;}
    const etag=`"${image.filename}"`;
    if(req.get("if-none-match")===etag){res.status(304).end();return;}
    try{
      let bytes=cache.get(image.filename);
      if(!bytes){
        try{bytes=await readFile(path.resolve("generated-artifacts/landing-assets",image.filename));}
        catch{bytes=await getAwsS3Service().getFile(`landing-assets/${image.filename}`)??undefined;}
        if(!bytes){res.status(503).json({message:"Landing asset temporarily unavailable"});return;}
        // Immutable filenames must never serve mismatching bytes.
        if(createHash("sha256").update(bytes).digest("hex").slice(0,24)!==image.filename.split(".")[0]){
          throw new Error("Landing asset integrity mismatch");
        }
        cache.set(image.filename,bytes);
      }
      res.set({"Content-Type":image.contentType,"Content-Length":String(bytes.length),
        "Cache-Control":"public, max-age=31536000, immutable",ETag:etag,"X-Content-Type-Options":"nosniff"});
      res.send(bytes);
    }catch{
      res.status(503).json({message:"Landing asset temporarily unavailable"});
    }
  });
}
