"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { charges, items } from "@/lib/db/schema";
import type { ActionResult } from "./types";

const chargeSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Bitte ein gültiges Datum wählen"),
  customerId: z.number().int().positive("Bitte einen Kunden wählen"),
  itemId: z.number().int().positive("Bitte eine Leistung wählen"),
  quantity: z
    .number()
    .positive("Anzahl muss größer als 0 sein")
    .refine((v) => Number.isFinite(v), "Ungültige Anzahl"),
  // The rate is editable per booking and defaults to the item's current rate;
  // a booking's rate is independent of later item rate changes. Zero is allowed.
  rateCents: z
    .number()
    .int()
    .nonnegative("Satz darf nicht negativ sein")
    .refine((v) => !Number.isNaN(v), "Ungültiger Satz"),
});

export type ChargeInput = z.infer<typeof chargeSchema>;

function loadItemForCustomer(itemId: number, customerId: number) {
  return db
    .select()
    .from(items)
    .where(and(eq(items.id, itemId), eq(items.customerId, customerId)))
    .get();
}

export async function createCharge(input: ChargeInput): Promise<ActionResult> {
  const parsed = chargeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { date, customerId, itemId, quantity, rateCents } = parsed.data;

  const item = loadItemForCustomer(itemId, customerId);
  if (!item) {
    return { ok: false, error: "Diese Leistung ist für den Kunden nicht definiert." };
  }

  // The rate is taken from the form (it defaults to the item's current rate but
  // may be overridden) and stored on the charge, so later item rate changes
  // never affect this booking.
  db.insert(charges)
    .values({
      date,
      customerId,
      itemId,
      quantity,
      rateCents,
      totalCents: Math.round(rateCents * quantity),
    })
    .run();
  revalidatePath("/buchungen");
  return { ok: true };
}

export async function updateCharge(
  id: number,
  input: ChargeInput
): Promise<ActionResult> {
  const parsed = chargeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { date, customerId, itemId, quantity, rateCents } = parsed.data;

  const existing = db.select().from(charges).where(eq(charges.id, id)).get();
  if (!existing) return { ok: false, error: "Buchung nicht gefunden." };
  if (existing.invoiceId !== null) {
    return {
      ok: false,
      error: "Diese Buchung ist bereits abgerechnet und kann nicht geändert werden.",
    };
  }

  const item = loadItemForCustomer(itemId, customerId);
  if (!item) {
    return { ok: false, error: "Diese Leistung ist für den Kunden nicht definiert." };
  }

  // The rate comes from the form, so an edit can adjust it directly.
  db.update(charges)
    .set({
      date,
      customerId,
      itemId,
      quantity,
      rateCents,
      totalCents: Math.round(rateCents * quantity),
    })
    .where(eq(charges.id, id))
    .run();
  revalidatePath("/buchungen");
  return { ok: true };
}

export async function deleteCharge(id: number): Promise<ActionResult> {
  const existing = db.select().from(charges).where(eq(charges.id, id)).get();
  if (!existing) return { ok: false, error: "Buchung nicht gefunden." };
  if (existing.invoiceId !== null) {
    return {
      ok: false,
      error: "Diese Buchung ist bereits abgerechnet und kann nicht gelöscht werden.",
    };
  }
  db.delete(charges).where(eq(charges.id, id)).run();
  revalidatePath("/buchungen");
  return { ok: true };
}
