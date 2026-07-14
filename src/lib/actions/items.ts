"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { charges, items } from "@/lib/db/schema";
import type { ActionResult } from "./types";

const itemSchema = z.object({
  customerId: z.number().int().positive("Bitte einen Kunden wählen"),
  name: z.string().trim().min(1, "Name darf nicht leer sein"),
  description: z.string().trim(),
  type: z.enum(["course", "expense"]),
  rateCents: z
    .number()
    .int()
    .nonnegative("Satz darf nicht negativ sein")
    .refine((v) => !Number.isNaN(v), "Ungültiger Satz"),
  unitId: z.number().int().positive("Bitte eine Einheit wählen"),
});

export type ItemInput = z.infer<typeof itemSchema>;

export async function createItem(input: ItemInput): Promise<ActionResult> {
  const parsed = itemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  db.insert(items).values(parsed.data).run();
  revalidatePath("/leistungen");
  return { ok: true };
}

// Rate changes are deliberately allowed at any time: existing charges keep
// the rate snapshot taken when they were booked, so history and invoices
// are unaffected; only future bookings use the new rate.
export async function updateItem(id: number, input: ItemInput): Promise<ActionResult> {
  const parsed = itemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const existing = db.select().from(items).where(eq(items.id, id)).get();
  if (!existing) return { ok: false, error: "Leistung nicht gefunden." };

  // The customer of an item is fixed once charges exist, otherwise past
  // bookings would suddenly belong to an item of another customer.
  if (existing.customerId !== parsed.data.customerId) {
    const used = await db.$count(charges, eq(charges.itemId, id));
    if (used > 0) {
      return {
        ok: false,
        error: "Der Kunde kann nicht geändert werden, da bereits Buchungen existieren.",
      };
    }
  }

  db.update(items).set(parsed.data).where(eq(items.id, id)).run();
  revalidatePath("/leistungen");
  revalidatePath("/buchungen");
  return { ok: true };
}

export async function deleteItem(id: number): Promise<ActionResult> {
  const used = await db.$count(charges, eq(charges.itemId, id));
  if (used > 0) {
    return {
      ok: false,
      error: `Diese Leistung hat ${used} Buchung(en) und kann nicht gelöscht werden.`,
    };
  }
  db.delete(items).where(eq(items.id, id)).run();
  revalidatePath("/leistungen");
  return { ok: true };
}
