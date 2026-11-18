#!/usr/bin/env node

import "../server/loadEnv.mjs";
import { createDatabase } from "../server/db.mjs";

const db = createDatabase();
const ok = await db.init();

console.log(
  JSON.stringify(
    {
      configured: db.configured,
      available: db.isAvailable(),
      error: db.isAvailable() ? null : db.error(),
    },
    null,
    2,
  ),
);

await db.close();
process.exitCode = ok ? 0 : 1;
