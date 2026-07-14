"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { preferences } from "@/lib/db/schema";
import type { ActionResult } from "./types";

const preferencesSchema = z.object({
  name: z.string().trim(),
  businessName: z.string().trim(),
  address: z.string().trim(),
  email: z.string().trim().email("Ungültige E-Mail-Adresse").or(z.literal("")),
  phone: z.string().trim(),
  iban: z.string().trim(),
  currency: z
    .string()
    .trim()
    .length(3, "Währung muss ein 3-stelliger ISO-Code sein (z. B. EUR)")
    .toUpperCase(),
  vatNote: z.string().trim(),
  firstInvoiceNumber: z
    .string()
    .trim()
    .regex(
      /^(\d{4}-\d{1,4})?$/,
      "Erste Rechnungsnummer muss das Format Jahr-Nummer haben (z. B. 2026-015) oder leer sein"
    ),
});

export async function updatePreferences(
  input: z.infer<typeof preferencesSchema>
): Promise<ActionResult> {
  const parsed = preferencesSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  db.update(preferences).set(parsed.data).where(eq(preferences.id, 1)).run();
  revalidatePath("/", "layout");
  return { ok: true };
}
