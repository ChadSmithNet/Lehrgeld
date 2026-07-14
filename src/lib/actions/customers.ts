"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { charges, customers, invoices, items } from "@/lib/db/schema";
import type { ActionResult } from "./types";

const customerSchema = z.object({
  name: z.string().trim().min(1, "Name darf nicht leer sein"),
  addressee: z.string().trim(),
  address: z.string().trim(),
  email: z.string().trim().email("Ungültige E-Mail-Adresse").or(z.literal("")),
});

export type CustomerInput = z.infer<typeof customerSchema>;

export async function createCustomer(input: CustomerInput): Promise<ActionResult> {
  const parsed = customerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  db.insert(customers).values(parsed.data).run();
  revalidatePath("/kunden");
  return { ok: true };
}

export async function updateCustomer(
  id: number,
  input: CustomerInput
): Promise<ActionResult> {
  const parsed = customerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  db.update(customers).set(parsed.data).where(eq(customers.id, id)).run();
  revalidatePath("/kunden");
  return { ok: true };
}

export async function deleteCustomer(id: number): Promise<ActionResult> {
  const itemCount = await db.$count(items, eq(items.customerId, id));
  const chargeCount = await db.$count(charges, eq(charges.customerId, id));
  const invoiceCount = await db.$count(invoices, eq(invoices.customerId, id));
  if (itemCount > 0 || chargeCount > 0 || invoiceCount > 0) {
    return {
      ok: false,
      error:
        "Dieser Kunde hat Leistungen, Buchungen oder Rechnungen und kann nicht gelöscht werden.",
    };
  }
  db.delete(customers).where(eq(customers.id, id)).run();
  revalidatePath("/kunden");
  return { ok: true };
}
