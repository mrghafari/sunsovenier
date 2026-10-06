import { seedAccounting } from "../server/modules/accounting/seed";
import { pool } from "../server/db";
if (process.env.NODE_ENV !== "development") throw new Error("This seed runner is development-only");
try {
  // A developer script is not a signed-in staff action. Never impersonate a user.
  console.log(await seedAccounting({actorId:0,actorType:"system",canManage:true}));
} finally { await pool.end(); }