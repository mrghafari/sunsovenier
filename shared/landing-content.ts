import {z} from "zod";

export const landingLanguages=["en","fa","ar","tr"] as const;
export type LandingLanguage=typeof landingLanguages[number];
export const landingProductIds=["drum220","ibc1000","tank1500","fert","logistics","water"] as const;
export const landingPackageIds=["drum220","ibc1000","tank1500","bag25","bigbag"] as const;
const textFields=z.object({
  title:z.string().trim().min(1).max(180).optional(),
  short:z.string().trim().max(1200).optional(),
  long:z.string().trim().max(12000).optional(),
}).strict();
const imageUrl=z.string().regex(/^\/api\/landing-(?:assets|media)\/[a-f0-9]{24,64}\.(?:jpg|png|webp|gif|avif)$/);
const customProduct=z.object({
  id:z.string().regex(/^custom-[a-zA-Z0-9-]{1,80}$/),
  title:z.string().trim().min(1).max(180),
  short:z.string().trim().max(1200),
  long:z.string().trim().max(12000),
  specs:z.array(z.string().trim().max(500)).max(20),
  pack:z.array(z.enum(landingPackageIds)).min(1).max(5),
  asset:z.number().int().min(0).max(9),
  categoryPath:z.literal("/contact"),
  custom:z.literal(true),
}).strict();
export const landingContentSchema=z.object({
  revision:z.number().int().min(0),
  images:z.record(imageUrl),
  edits:z.record(z.enum(landingLanguages),z.record(textFields)),
  custom:z.array(customProduct).max(40),
}).strict().superRefine((value,ctx)=>{
  const ids=new Set<string>(landingProductIds);
  for(const item of value.custom){
    if(ids.has(item.id))ctx.addIssue({code:"custom",message:"Duplicate product ID",path:["custom"]});
    ids.add(item.id);
  }
  const imageKeys=new Set([...ids,"hero-0","hero-1","hero-2","about"]);
  for(const key of Object.keys(value.images)){
    if(!imageKeys.has(key))ctx.addIssue({code:"custom",message:"Unknown image slot",path:["images",key]});
  }
  for(const [language,edits] of Object.entries(value.edits)){
    for(const key of Object.keys(edits)){
      if(!ids.has(key))ctx.addIssue({code:"custom",message:"Unknown product",path:["edits",language,key]});
    }
  }
});
export type LandingContent=z.infer<typeof landingContentSchema>;
export function defaultLandingContent():LandingContent{
  return {revision:0,images:{},edits:{en:{},fa:{},ar:{},tr:{}},custom:[]};
}
