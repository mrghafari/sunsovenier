import { z } from "zod";

const textField = (maxLength: number) => z.string().trim().max(maxLength)
  .refine((value) => !value.includes("\0"), "Text cannot contain a null character.");

export const contractDraftLanguages = ["fa", "ar", "en", "tr"] as const;
export type ContractDraftLanguage = typeof contractDraftLanguages[number];
export type ShopContractLanguage = ContractDraftLanguage;

export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

const productDetailsSchema = z.record(
  z.string().max(400),
  z.object({
    grade: textField(500),
    tolerance: textField(500),
    packaging: textField(500),
  }).strict(),
).superRefine((products, context) => {
  const entries = Object.entries(products);
  if (entries.length > 100) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "At most 100 product entries are allowed." });
  }
  const normalizedKeys = new Set<string>();
  for (const [key] of entries) {
    const normalized = key.trim();
    if (!normalized || normalized.length > 200 || normalized.includes("\0")
      || ["__proto__", "prototype", "constructor"].includes(normalized)) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "Product entry name is invalid." });
      continue;
    }
    if (normalizedKeys.has(normalized)) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "Product entry names must be unique after trimming." });
      break;
    }
    normalizedKeys.add(normalized);
  }
}).transform((products) => Object.fromEntries(
  Object.entries(products).map(([key, value]) => [key.trim(), value]),
));

const contractDraftShape = z.object({
  version: z.union([z.literal(1), z.literal(2)]),
  // "iraq" is retained solely for stored v1 export-to-Iraq drafts. New v2
  // drafts use "iraqLocal" for local sales in Iraq.
  dealType: z.enum(["iran", "iraq", "iraqLocal", "intl"]),
  language: z.enum(contractDraftLanguages).optional(),
  date: textField(100),
  seller: z.object({
    name: textField(300),
    registration: textField(200),
    address: textField(1000),
    representative: textField(300),
    contact: textField(300),
    taxNumber: textField(200).optional(),
    country: textField(200).optional(),
    city: textField(200).optional(),
    postalCode: textField(100).optional(),
    website: textField(300).optional(),
  }).strict(),
  buyer: z.object({
    country: textField(200),
    registration: textField(200),
    address: textField(1000),
    representative: textField(300),
    contact: textField(300),
  }).strict(),
  productDetails: productDetailsSchema,
  payment: z.object({
    method: z.enum(["advance", "lc", "tt", "credit"]),
    days: textField(100),
  }).strict(),
  delivery: z.object({
    location: textField(500),
    date: textField(100),
  }).strict(),
  disputeCity: textField(300),
}).strict();

const validatedContractDraftShape = contractDraftShape.superRefine((draft, context) => {
  if (draft.version === 1) return;
  if (!draft.language) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["language"], message: "A document language is required for v2 contract drafts." });
  }
  if (draft.dealType === "iraq") {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["dealType"], message: "V2 contracts must use the Iraq domestic transaction type." });
  }
  if (draft.date && !isValidIsoDate(draft.date)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["date"], message: "Contract date must be a real YYYY-MM-DD date." });
  }
  if (draft.delivery.date && !isValidIsoDate(draft.delivery.date)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["delivery", "date"], message: "Delivery date must be a real YYYY-MM-DD date." });
  }
});

export const shopContractDraftSchema = z.preprocess((input, context) => {
  try {
    const serialized = JSON.stringify(input);
    if (typeof serialized !== "string" || new TextEncoder().encode(serialized).byteLength > 25 * 1024) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "Contract draft must not exceed 25 KB when serialized." });
    }
  } catch {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Contract draft must be serializable." });
  }
  return input;
}, validatedContractDraftShape).refine(
  (draft) => new TextEncoder().encode(JSON.stringify(draft)).byteLength <= 25 * 1024,
  { message: "Contract draft must not exceed 25 KB when serialized." },
);

export type ShopContractDraftData = z.infer<typeof shopContractDraftSchema>;