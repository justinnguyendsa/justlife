import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

// 🟡 LMS DB — TÁCH HOÀN TOÀN khỏi personal.db (ADR-002 Q1, R-JL-TWO-FACES-01).
// Credential RIÊNG: LMS_DATABASE_URL/LMS_DATABASE_AUTH_TOKEN. Local-first file mặc định "lms.db";
// đổi sang Turso (P5b go-live) bằng cách set 2 env trên — không rewrite.
const url = process.env.LMS_DATABASE_URL || "file:lms.db";
const authToken = process.env.LMS_DATABASE_AUTH_TOKEN;

export const lmsLibsql = createClient(authToken ? { url, authToken } : { url });
export const lmsDb = drizzle(lmsLibsql, { schema });
export { schema };
