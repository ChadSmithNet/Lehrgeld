import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  charges,
  customers,
  invoices,
  items,
  preferences,
  units,
} from "@/lib/db/schema";
import { ChargesClient } from "./charges-client";

export const dynamic = "force-dynamic";

export default function BuchungenPage() {
  const rows = db
    .select({
      id: charges.id,
      date: charges.date,
      customerId: charges.customerId,
      customerName: customers.name,
      itemId: charges.itemId,
      itemName: items.name,
      itemType: items.type,
      unitName: units.name,
      quantity: charges.quantity,
      rateCents: charges.rateCents,
      totalCents: charges.totalCents,
      invoiceId: charges.invoiceId,
      invoiceNumber: invoices.number,
    })
    .from(charges)
    .innerJoin(customers, eq(charges.customerId, customers.id))
    .innerJoin(items, eq(charges.itemId, items.id))
    .innerJoin(units, eq(items.unitId, units.id))
    .leftJoin(invoices, eq(charges.invoiceId, invoices.id))
    .orderBy(desc(charges.date), desc(charges.id))
    .all();

  const allCustomers = db.select().from(customers).orderBy(asc(customers.name)).all();
  const allItems = db.select().from(items).orderBy(asc(items.name)).all();
  const allUnits = db.select().from(units).all();
  const prefs = db.select().from(preferences).where(eq(preferences.id, 1)).get()!;

  return (
    <div className="max-w-6xl">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Buchungen</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Erfasste Kurse und Auslagen. Abgerechnete Buchungen sind schreibgeschützt.
      </p>
      <ChargesClient
        rows={rows}
        customers={allCustomers}
        items={allItems}
        units={allUnits}
        currency={prefs.currency}
      />
    </div>
  );
}
