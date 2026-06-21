"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { userSettings } from "@/db/schema";

export async function setSetting(key: string, value: string) {
  await db.insert(userSettings).values({ key, value })
    .onConflictDoUpdate({ target: userSettings.key, set: { value } });
  revalidatePath("/settings");
  return { ok: true };
}
