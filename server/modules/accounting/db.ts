import { drizzle } from "drizzle-orm/neon-serverless";
import { pool } from "../../db";
import * as schema from "./schema";

export const accountingDb = drizzle({ client: pool, schema });
export type AccountingTransaction = Parameters<Parameters<typeof accountingDb.transaction>[0]>[0];