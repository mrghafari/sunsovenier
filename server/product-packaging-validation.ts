import type { RequestHandler } from "express";
import { packagingSpecificationsSchema } from "../shared/product-packaging";

/** Validate before any product, batch, inventory or shop mutation. */
export const validateProductPackaging: RequestHandler = (req, res, next) => {
  if (!req.body || !Object.prototype.hasOwnProperty.call(req.body, "packagingSpecifications")) {
    next();
    return;
  }
  const result = packagingSpecificationsSchema.nullable().safeParse(req.body.packagingSpecifications);
  if (!result.success) {
    res.status(400).json({
      success: false,
      message: "Invalid container packaging specifications.",
      errors: result.error.issues.map(issue => ({
        path: ["packagingSpecifications", ...issue.path],
        message: issue.message,
      })),
    });
    return;
  }
  req.body.packagingSpecifications = result.data;
  next();
};
