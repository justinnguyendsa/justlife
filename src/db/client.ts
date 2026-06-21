import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

// libSQL: local-first file mặc định; đổi DATABASE_URL + DATABASE_AUTH_TOKEN sang Turso để bật đồng bộ (ADR-001).
const url = process.env.DATABASE_URL || "file:local.db";
const authToken = process.env.DATABASE_AUTH_TOKEN;

export const libsql = createClient(authToken ? { url, authToken } : { url });
export const db = drizzle(libsql, { schema });
export { schema };
