"use server";

import { requireOwner } from "@/lib/auth-guard";
import { revalidatePath } from "next/cache";
import { inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { userSettings, event } from "@/db/schema";
import { genId } from "@/lib/id";

// ─── SET ──────────────────────────────────────────────────────────────────────

export async function setSetting(key: string, value: string) {
  await requireOwner();

  await db
    .insert(userSettings)
    .values({ key, value })
    .onConflictDoUpdate({ target: userSettings.key, set: { value } });
  revalidatePath("/settings");
  return { ok: true };
}

// ─── GET MULTIPLE ──────────────────────────────────────────────────────────────

export async function getSettings(keys: string[]): Promise<Record<string, string>> {
  await requireOwner();

  if (keys.length === 0) return {};
  const rows = await db
    .select()
    .from(userSettings)
    .where(inArray(userSettings.key, keys));
  const result: Record<string, string> = {};
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return result;
}

// ─── APPEND EVENT ─────────────────────────────────────────────────────────────

export async function appendEvent(type: string, payload?: object) {
  await requireOwner();

  await db.insert(event).values({
    id: genId(),
    type,
    payload: JSON.stringify(payload ?? {}),
    at: Date.now(),
  });
}
