import { z } from "zod";

const textField = (maxLength: number) => z.string().trim().max(maxLength)
  .refine((value) => !value.includes("\0"), "Text cannot contain a null character.");

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
  version: z.literal(1),
  dealType: z.enum(["iran", "iraq", "intl"]),
  date: textField(100),
  seller: z.object({
    name: textField(300),
    registration: textField(200),
    address: textField(1000),
    representative: textField(300),
    contact: textField(300),
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
}, contractDraftShape).refine(
  (draft) => new TextEncoder().encode(JSON.stringify(draft)).byteLength <= 25 * 1024,
  { message: "Contract draft must not exceed 25 KB when serialized." },
);

export type ShopContractDraftData = z.infer<typeof shopContractDraftSchema>;