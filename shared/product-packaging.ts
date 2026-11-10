import { z } from "zod";

export const containerTypes = ["bottle", "jerrycan", "can", "drum", "ibc", "tank", "bag", "sack", "box", "bulk", "other"] as const;
export const containerMaterials = ["hdpe", "ldpe", "pp", "pet", "steel", "stainless_steel", "aluminium", "glass", "paper", "woven_pp", "composite", "other"] as const;
const text = z.string().trim().max(500).optional();
const positive = z.number().finite().positive().max(1_000_000_000).optional();
const nonnegative = z.number().finite().min(0).max(1_000_000_000).optional();
export const packagingSpecificationsSchema = z.object({
  version: z.literal(1).default(1),
  containerType: z.enum(containerTypes).optional(),
  material: z.enum(containerMaterials).optional(),
  materialGrade: text,
  manufacturer: text,
  model: text,
  lining: text,
  closure: text,
  nominalCapacityL: positive,
  usableCapacityL: positive,
  wallThicknessMm: positive,
  tareWeightKg: positive,
  lengthMm: positive, widthMm: positive, heightMm: positive, diameterMm: positive,
  workingPressureBar: nonnegative,
  testPressureKpa: nonnegative,
  minTemperatureC: z.number().finite().min(-273.15).max(2000).optional(),
  maxTemperatureC: z.number().finite().min(-273.15).max(2000).optional(),
  maxGrossMassKg: positive,
  stackingLoadKg: nonnegative,
  reusable: z.boolean().optional(),
  antistatic: z.boolean().optional(),
  uvResistant: z.boolean().optional(),
  standardReference: text,
  unMark: text,
  performanceLevel: z.enum(["X", "Y", "Z"]).optional(),
  testReportReference: text,
  compatibilityNotes: z.string().trim().max(2000).optional(),
  notes: z.string().trim().max(2000).optional(),
  additionalProperties: z.array(z.object({
    name: z.string().trim().min(1).max(120),
    value: z.string().trim().min(1).max(500),
    unit: z.string().trim().max(60).optional(),
  }).strict()).max(30).optional(),
}).strict().superRefine((value, ctx) => {
  if (value.nominalCapacityL !== undefined && value.usableCapacityL !== undefined && value.usableCapacityL > value.nominalCapacityL) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["usableCapacityL"], message: "Usable capacity must not exceed nominal capacity." });
  }
  if (value.minTemperatureC !== undefined && value.maxTemperatureC !== undefined && value.minTemperatureC > value.maxTemperatureC) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["maxTemperatureC"], message: "Maximum temperature must not be below minimum temperature." });
  }
});
export type PackagingSpecifications = z.infer<typeof packagingSpecificationsSchema>;
