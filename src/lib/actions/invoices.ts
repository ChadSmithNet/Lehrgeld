"use server";

import { revalidatePath } from "next/cache";
import { and, eq, gte, isNull, lte } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { charges, customers, invoices, preferences } from "@/lib/db/schema";
import { monthRange } from "@/lib/dates";
import { parseInvoiceNumber } from "@/lib/format";
import type { ActionResult } from "./types";

const generateSchema = z.object({
  customerId: z.number().int().positive("Bitte einen Kunden wählen"),
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
});

export type GenerateInvoiceInput = z.infer<typeof generateSchema>;

function unbilledChargesFilter(customerId: number, year: number, month: number) {
  const { first, last } = monthRange(year, month);
  return and(
    eq(charges.customerId, customerId),
    isNull(charges.invoiceId),
    gte(charges.date, first),
    lte(charges.date, last)
  );
}

export async function generateInvoice(
  input: GenerateInvoiceInput
): Promise<ActionResult & { invoiceId?: number }> {
  const parsed = generateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { customerId, year, month } = parsed.data;

  try {
    const invoiceId = db.transaction((tx) => {
      const open = tx
        .select()
        .from(charges)
        .where(unbilledChargesFilter(customerId, year, month))
        .all();
      if (open.length === 0) {
        throw new Error(
          "Für diesen Kunden und Monat gibt es keine offenen Buchungen."
        );
      }

      // Next sequential number within the year, based on the highest
      // existing suffix so deleted invoices can't cause duplicates. The
      // "Erste Rechnungsnummer" preference raises the floor for its year,
      // for users whose earlier invoices were written outside the app.
      const prefs = tx
        .select({ firstInvoiceNumber: preferences.firstInvoiceNumber })
        .from(preferences)
        .where(eq(preferences.id, 1))
        .get();
      const start = parseInvoiceNumber(prefs?.firstInvoiceNumber ?? "");
      const floorSeq = start && start.year === year ? start.seq - 1 : 0;

      const yearInvoices = tx
        .select({ number: invoices.number })
        .from(invoices)
        .where(eq(invoices.year, year))
        .all();
      const maxSeq = yearInvoices.reduce((max, row) => {
        const seq = Number.parseInt(row.number.split("-")[1] ?? "0", 10);
        return Number.isNaN(seq) ? max : Math.max(max, seq);
      }, floorSeq);
      const number = `${year}-${String(maxSeq + 1).padStart(3, "0")}`;

      const totalCents = open.reduce((sum, c) => sum + c.totalCents, 0);
      const issueDate = new Date().toISOString().slice(0, 10);

      // Freeze the recipient onto the invoice so later customer edits never
      // change this invoice or its PDF.
      const customer = tx
        .select()
        .from(customers)
        .where(eq(customers.id, customerId))
        .get();
      if (!customer) throw new Error("Kunde nicht gefunden.");

      const inserted = tx
        .insert(invoices)
        .values({
          customerId,
          year,
          month,
          number,
          issueDate,
          totalCents,
          customerName: customer.name,
          customerLegalName: customer.legalName,
          customerAddressee: customer.addressee,
          customerAddress: customer.address,
        })
        .returning({ id: invoices.id })
        .get();

      tx.update(charges)
        .set({ invoiceId: inserted.id })
        .where(unbilledChargesFilter(customerId, year, month))
        .run();

      return inserted.id;
    });

    revalidatePath("/rechnungen");
    revalidatePath("/buchungen");
    return { ok: true, invoiceId };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Rechnung konnte nicht erstellt werden.",
    };
  }
}

export async function deleteInvoice(id: number): Promise<ActionResult> {
  db.transaction((tx) => {
    tx.update(charges)
      .set({ invoiceId: null })
      .where(eq(charges.invoiceId, id))
      .run();
    tx.delete(invoices).where(eq(invoices.id, id)).run();
  });
  revalidatePath("/rechnungen");
  revalidatePath("/buchungen");
  return { ok: true };
}
