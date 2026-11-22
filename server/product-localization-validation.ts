import type { RequestHandler } from "express";
import { normalizeProductLocalizations, productLocalizationsSchema } from "@shared/product-localizations";

export const validateProductLocalizations: RequestHandler = (req, res, next) => {
  if (req.body?.productLocalizations === undefined) return next();
  const result = productLocalizationsSchema.nullable().safeParse(req.body.productLocalizations);
  if (!result.success) {
    res.status(400).json({ success: false, message: "Invalid localized product text." });
    return;
  }
  req.body.productLocalizations = result.data ? normalizeProductLocalizations(result.data) : null;
  next();
};
