import {z} from "zod";
import {defaultLandingPageSettings,landingPageSettingsSchema} from "./landing-page-settings";
import {landingAboutWindowPanes} from "./landing-about-window";

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
  page:landingPageSettingsSchema.default(defaultLandingPageSettings),
}).strict().superRefine((value,ctx)=>{
  const ids=new Set<string>(landingProductIds);
  for(const item of value.custom){
    if(ids.has(item.id))ctx.addIssue({code:"custom",message:"Duplicate product ID",path:["custom"]});
    ids.add(item.id);
  }
  const imageKeys=new Set([...ids,...value.page.slides.map(slide=>`hero-${slide.id}`),...value.page.partners.map(partner=>`partner-${partner.id}`),
    ...value.page.layout.rows.flatMap(row=>row.blocks.filter(block=>block.type==="image").map(block=>`layout-${block.id}`)),
    ...landingAboutWindowPanes.map(pane=>pane.key),"about","seo"]);
  for(const key of Object.keys(value.images)){
    if(!imageKeys.has(key))ctx.addIssue({code:"custom",message:"Unknown image slot",path:["images",key]});
  }
  for(const [language,edits] of Object.entries(value.edits)){
    for(const key of Object.keys(edits)){
      if(!ids.has(key))ctx.addIssue({code:"custom",message:"Unknown product",path:["edits",language,key]});
    }
  }
  for(const key of Object.keys(value.page.cards)){
    if(!ids.has(key))ctx.addIssue({code:"custom",message:"Unknown product settings",path:["page","cards",key]});
  }
  for(const slide of value.page.slides){
    if(!["0","1","2"].includes(slide.id)&&!value.images[`hero-${slide.id}`])
      ctx.addIssue({code:"custom",message:"Upload an image for each added banner",path:["images",`hero-${slide.id}`]});
  }
  for(const row of value.page.layout.rows){
    for(const block of row.blocks){
      if(block.enabled&&block.type==="image"&&!value.images[`layout-${block.id}`])
        ctx.addIssue({code:"custom",message:"Upload an image for each enabled image block",path:["images",`layout-${block.id}`]});
    }
  }
});
export type LandingContent=z.infer<typeof landingContentSchema>;
export function defaultLandingContent():LandingContent{
  return {revision:0,images:{},edits:{en:{},fa:{},ar:{},tr:{}},custom:[],page:defaultLandingPageSettings()};
}
