import { asc, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  charges,
  customers,
  invoices,
  items,
  preferences,
} from "@/lib/db/schema";
import { InvoicesClient } from "./invoices-client";

export const dynamic = "force-dynamic";

export default function RechnungenPage() {
  const invoiceRows = db
    .select({
      id: invoices.id,
      number: invoices.number,
      // The frozen recipient name, so the list matches the invoice PDF even
      // after the customer is later renamed.
      customerName: invoices.customerName,
      year: invoices.year,
      month: invoices.month,
      issueDate: invoices.issueDate,
      totalCents: invoices.totalCents,
    })
    .from(invoices)
    .orderBy(desc(invoices.number))
    .all();

  const openCharges = db
    .select({
      id: charges.id,
      date: charges.date,
      customerId: charges.customerId,
      itemName: items.name,
      totalCents: charges.totalCents,
    })
    .from(charges)
    .innerJoin(items, eq(charges.itemId, items.id))
    .where(isNull(charges.invoiceId))
    .orderBy(asc(charges.date))
    .all();

  const allCustomers = db.select().from(customers).orderBy(asc(customers.name)).all();
  const prefs = db.select().from(preferences).where(eq(preferences.id, 1)).get()!;

  return (
    <div className="max-w-5xl">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Rechnungen</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Monatsrechnungen je Kunde aus den offenen Buchungen erzeugen.
      </p>
      <InvoicesClient
        invoices={invoiceRows}
        openCharges={openCharges}
        customers={allCustomers}
        currency={prefs.currency}
      />
    </div>
  );
}
