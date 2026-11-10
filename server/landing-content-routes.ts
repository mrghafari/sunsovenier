import type {Express,RequestHandler} from "express";
import multer from "multer";
import path from "node:path";
import {createHash} from "node:crypto";
import {ZodError} from "zod";
import {pool} from "./db";
import {getAwsS3Service} from "./aws-s3-service";
import {readLandingContent,saveLandingContent,LandingConflictError} from "./landing-content-store";
import {prepareLandingImage,LandingImageValidationError} from "./landing-image-processing";

const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:8*1024*1024,files:1,fields:0}});
const mediaName=/^[a-f0-9]{64}\.(jpg|png|webp|gif|avif)$/;
const mediaTypes:Record<string,string>={jpg:"image/jpeg",png:"image/png",webp:"image/webp",gif:"image/gif",avif:"image/avif"};
export function registerLandingContentRoutes(app:Express,permissions:{view:RequestHandler;edit:RequestHandler}){
  app.get("/api/landing-content",async(_req,res)=>{
    res.set("Cache-Control","no-store");
    try{res.json({success:true,data:await readLandingContent()});}
    catch{res.status(503).json({success:false,message:"Landing content is temporarily unavailable."});}
  });
  app.get("/api/content-management/landing",permissions.view,async(_req,res)=>{
    res.set("Cache-Control","no-store");
    try{res.json({success:true,data:await readLandingContent()});}
    catch{res.status(503).json({success:false,message:"Could not read landing content. Existing content has not been changed."});}
  });
  app.put("/api/content-management/landing",permissions.edit,async(req,res)=>{
    try{res.json({success:true,data:await saveLandingContent(req.body)});}
    catch(error){
      const status=error instanceof LandingConflictError?409:error instanceof ZodError?400:500;
      res.status(status).json({success:false,message:status===409
        ?"The landing page was changed by another editor. Reload before saving."
        :status===400?"Invalid landing content. Check required fields and image URLs."
        :"Could not save landing content. Existing content has not been overwritten."});
    }
  });
  app.post("/api/content-management/landing/images",permissions.edit,(req,res)=>{
    upload.single("file")(req,res,async(error)=>{
      if(error){res.status(error.code==="LIMIT_FILE_SIZE"?413:400).json({success:false,message:"Choose one image up to 8 MB."});return;}
      if(!req.file){res.status(400).json({success:false,message:"An image is required."});return;}
      let image:Awaited<ReturnType<typeof prepareLandingImage>>;
      try{
        image=await prepareLandingImage(req.file.buffer);
      }catch(error){res.status(400).json({success:false,message:error instanceof LandingImageValidationError?error.message:"The image could not be processed."});return;}
      const filename=`${createHash("sha256").update(image.buffer).digest("hex")}.${image.extension}`;
      const url=`/api/landing-media/${filename}`;
      try{
        // Raster originals stay unchanged; SVGs are stored as safe, lossless PNG.
        const ok=await getAwsS3Service().uploadPrivateFileToKey(image.buffer,`landing-media/${filename}`,image.mimeType);
        if(!ok)throw new Error("Storage unavailable");
        await pool.query(`INSERT INTO image_assets(filename,original_name,mime_type,size,url,alt,section,is_active)
          SELECT $1,$2,$3,$4,$5,'','landing_page',true
          WHERE NOT EXISTS(SELECT 1 FROM image_assets WHERE url=$5 AND section='landing_page')`,
          [filename,path.basename(req.file.originalname).replace(/[\x00-\x1f]/g,"").slice(0,255),image.mimeType,image.bytes,url]);
        res.status(201).json({success:true,data:{url,width:image.width,height:image.height,bytes:image.bytes}});
      }catch{res.status(503).json({success:false,message:"Image upload failed. The published page has not changed."});}
    });
  });
  app.get("/api/landing-media/:filename",async(req,res)=>{
    const filename=req.params.filename;
    if(!mediaName.test(filename)){res.status(404).end();return;}
    try{
      const url=`/api/landing-media/${filename}`;
      const existing=await pool.query("SELECT 1 FROM image_assets WHERE url=$1 AND section='landing_page' AND is_active=true LIMIT 1",[url]);
      if(!existing.rows.length){res.status(404).end();return;}
      const bytes=await getAwsS3Service().getFile(`landing-media/${filename}`);
      if(!bytes){res.status(503).end();return;}
      if(createHash("sha256").update(bytes).digest("hex")!==filename.split(".")[0])throw new Error("Image integrity mismatch");
      res.set({"Content-Type":mediaTypes[filename.split(".")[1]],"Cache-Control":"public, max-age=31536000, immutable",
        "X-Content-Type-Options":"nosniff",ETag:`"${filename}"`});
      res.send(bytes);
    }catch{res.status(503).end();}
  });
}
