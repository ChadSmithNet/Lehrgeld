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
  const { date, customerId, itemId, quantity } = parsed.data;

  const item = loadItemForCustomer(itemId, customerId);
  if (!item) {
    return { ok: false, error: "Diese Leistung ist für den Kunden nicht definiert." };
  }

  // Snapshot the current rate so later rate changes never affect this charge.
  const rateCents = item.rateCents;
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
  const { date, customerId, itemId, quantity } = parsed.data;

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

  // Keep the original rate snapshot unless the booking is moved to a
  // different item — then the new item's current rate applies.
  const rateCents = existing.itemId === itemId ? existing.rateCents : item.rateCents;
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
