"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { items, units } from "@/lib/db/schema";
import type { ActionResult } from "./types";

const nameSchema = z
  .string()
  .trim()
  .min(1, "Name darf nicht leer sein")
  .max(100, "Name ist zu lang");

export async function createUnit(name: string): Promise<ActionResult> {
  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  try {
    db.insert(units).values({ name: parsed.data }).run();
  } catch {
    return { ok: false, error: "Eine Einheit mit diesem Namen existiert bereits." };
  }
  revalidatePath("/einheiten");
  return { ok: true };
}

export async function updateUnit(id: number, name: string): Promise<ActionResult> {
  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  try {
    db.update(units).set({ name: parsed.data }).where(eq(units.id, id)).run();
  } catch {
    return { ok: false, error: "Eine Einheit mit diesem Namen existiert bereits." };
  }
  revalidatePath("/einheiten");
  return { ok: true };
}

export async function deleteUnit(id: number): Promise<ActionResult> {
  const used = await db.$count(items, eq(items.unitId, id));
  if (used > 0) {
    return {
      ok: false,
      error: `Diese Einheit wird von ${used} Leistung(en) verwendet und kann nicht gelöscht werden.`,
    };
  }
  db.delete(units).where(eq(units.id, id)).run();
  revalidatePath("/einheiten");
  return { ok: true };
}
