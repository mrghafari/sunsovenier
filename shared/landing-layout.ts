import { z } from "zod";

export const layoutSectionTypes = ["hero", "quote", "trusted", "about", "stats", "services", "categories", "process", "faq", "footer"] as const;
export type LayoutSectionType = typeof layoutSectionTypes[number];
export const layoutElementGroups = {
  hero: ["copy", "quote"],
  trusted: ["label", "partners"],
  about: ["image", "copy", "stats"],
  services: ["heading", "categories", "cards"],
  process: ["heading", "steps"],
  faq: ["heading", "items"],
  footer: ["brand", "company", "packages", "connect", "bottom"],
  form: ["productInterest", "fullName", "email", "company", "phone", "address", "message", "submit"],
} as const;
const localized = z.record(z.enum(["en", "fa", "ar", "tr"]), z.string().trim().max(12000));
const id = z.string().regex(/^[a-zA-Z0-9-]{1,80}$/);
// No HTML, scripts, arbitrary styles or executable URLs in saved layouts.
const href = z.string().trim().max(1000).refine(value => {
  if (/[\s\\\u0000-\u001f]/u.test(value)) return false;
  if (/^\/(?!\/)/.test(value) || /^#[a-zA-Z][a-zA-Z0-9_-]*$/.test(value)) return true;
  if (/^tel:\+?[0-9()-]+$/.test(value) || /^mailto:[^@]+@[^@]+\.[^@]+$/.test(value)) return true;
  try { const parsed = new URL(value); return parsed.protocol === "https:" && !parsed.username && !parsed.password; }
  catch { return false; }
});
export const landingLayoutBlockSchema = z.object({
  id,
  type: z.enum([...layoutSectionTypes, "text", "image", "button", "spacer"]),
  enabled: z.boolean(),
  title: localized,
  body: localized,
  href: href.optional(),
  alignment: z.enum(["start", "center", "end"]),
  tone: z.enum(["plain", "light", "navy"]),
  spacing: z.enum(["small", "normal", "large"]),
}).strict();
export type LandingLayoutBlock = z.infer<typeof landingLayoutBlockSchema>;
export const landingLayoutRowSchema = z.object({
  id,
  columns: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  width: z.enum(["full", "contained"]),
  gap: z.enum(["small", "normal", "large"]),
  blocks: z.array(landingLayoutBlockSchema).max(12),
}).strict();
const elementOrderSchema = z.object({
  hero: z.array(z.enum(layoutElementGroups.hero)),
  trusted: z.array(z.enum(layoutElementGroups.trusted)),
  about: z.array(z.enum(layoutElementGroups.about)),
  services: z.array(z.enum(layoutElementGroups.services)),
  process: z.array(z.enum(layoutElementGroups.process)),
  faq: z.array(z.enum(layoutElementGroups.faq)),
  footer: z.array(z.enum(layoutElementGroups.footer)),
  form: z.array(z.enum(layoutElementGroups.form)),
}).strict().superRefine((value, context) => {
  for (const [key, expected] of Object.entries(layoutElementGroups)) {
    const actual = value[key as keyof typeof value];
    if (actual.length !== expected.length || new Set(actual).size !== expected.length) {
      context.addIssue({ code: "custom", path: [key], message: "Keep each element exactly once; reorder rather than remove required elements." });
    }
  }
});
export const landingLayoutSchema = z.object({
  version: z.literal(1),
  rows: z.array(landingLayoutRowSchema).min(1).max(30),
  elements: elementOrderSchema,
}).strict().superRefine((layout, context) => {
  const ids = new Set<string>();
  const sections = new Set<string>();
  let count = 0;
  for (const row of layout.rows) {
    if (ids.has(row.id)) context.addIssue({ code: "custom", path: ["rows"], message: "Duplicate layout ID." });
    ids.add(row.id);
    for (const block of row.blocks) {
      count++;
      if (ids.has(block.id)) context.addIssue({ code: "custom", path: ["rows"], message: "Duplicate layout ID." });
      ids.add(block.id);
      if ((layoutSectionTypes as readonly string[]).includes(block.type)) {
        if (sections.has(block.type)) context.addIssue({ code: "custom", path: ["rows"], message: "A site section may only appear once." });
        sections.add(block.type);
      }
      if (block.type === "button" && !block.href) context.addIssue({ code: "custom", path: ["rows"], message: "A button needs a destination." });
    }
  }
  if (count > 100) context.addIssue({ code: "custom", path: ["rows"], message: "At most 100 blocks are allowed." });
});
export type LandingLayout = z.infer<typeof landingLayoutSchema>;
export type LandingLayoutRow = LandingLayout["rows"][number];
export function createLayoutBlock(type: LandingLayoutBlock["type"], blockId: string): LandingLayoutBlock {
  return { id: blockId, type, enabled: true, title: {}, body: {}, alignment: "start", tone: "plain", spacing: "normal", ...(type === "button" ? { href: "/contact" } : {}) };
}
export function defaultLandingLayout(): LandingLayout {
  return {
    version: 1,
    rows: (["hero", "trusted", "about", "services", "process", "faq", "footer"] as const).map(type => ({
      id: `row-${type}`, columns: 1, width: "full", gap: "normal", blocks: [createLayoutBlock(type, `block-${type}`)],
    })),
    elements: {
      hero: ["copy", "quote"], trusted: ["label", "partners"], about: ["image", "copy", "stats"],
      services: ["heading", "categories", "cards"], process: ["heading", "steps"], faq: ["heading", "items"],
      footer: ["brand", "company", "packages", "connect", "bottom"],
      form: ["productInterest", "fullName", "email", "company", "phone", "address", "message", "submit"],
    },
  };
}
export function moveLayoutBlock(layout: LandingLayout, sourceRow: string, sourceIndex: number, destinationRow: string, destinationIndex: number): LandingLayout {
  const next = structuredClone(layout);
  const source = next.rows.find(row => row.id === sourceRow);
  const destination = next.rows.find(row => row.id === destinationRow);
  if (!source || !destination || !source.blocks[sourceIndex] || destinationIndex < 0 || destinationIndex > destination.blocks.length) return layout;
  if (source !== destination && destination.blocks.length >= 12) return layout;
  const [block] = source.blocks.splice(sourceIndex, 1);
  destination.blocks.splice(destinationIndex, 0, block);
  return next;
}

export function effectiveLayoutSections(layout: LandingLayout, flags: Record<LayoutSectionType, boolean>): Record<LayoutSectionType, boolean> {
  const all = layout.rows.flatMap(row => row.blocks);
  const placed = (type: string) => all.some(block => block.type === type && block.enabled);
  const standalone = (type: string) => all.some(block => block.type === type);
  return {
    hero: flags.hero && placed("hero"),
    quote: flags.quote && (standalone("quote") ? placed("quote") : placed("hero")),
    trusted: flags.trusted && placed("trusted"),
    about: flags.about && placed("about"),
    stats: flags.stats && (standalone("stats") ? placed("stats") : placed("about")),
    services: flags.services && placed("services"),
    categories: flags.categories && (standalone("categories") ? placed("categories") : flags.services && placed("services")),
    process: flags.process && placed("process"),
    faq: flags.faq && placed("faq"),
    footer: flags.footer && placed("footer"),
  };
}
