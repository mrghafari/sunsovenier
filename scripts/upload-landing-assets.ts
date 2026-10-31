import {readFile} from "node:fs/promises";
import path from "node:path";
import {AwsS3Service} from "../server/aws-s3-service";
import {storage} from "../server/storage";
import {pool} from "../server/db";
import manifest from "../client/src/pages/landing/landing-assets.json";

try{
  const settings=await storage.getActiveAwsS3Settings();
  if(!settings)throw new Error("Active application storage configuration required");
  const service=new AwsS3Service(settings);
  let verified=0;
  for(const image of [...manifest.images,...manifest.files]){
    const bytes=await readFile(path.resolve("generated-artifacts/landing-assets",image.filename));
    const key=`landing-assets/${image.filename}`;
    if(!await service.uploadPrivateFileToKey(bytes,key,image.contentType))throw new Error("Landing asset upload failed");
    const stored=await service.getFile(key);
    if(!stored?.equals(bytes))throw new Error("Stored landing asset verification failed");
    verified++;
  }
  console.log(`Uploaded and byte-verified ${verified} immutable landing assets in application storage.`);
}finally{await pool.end();}
