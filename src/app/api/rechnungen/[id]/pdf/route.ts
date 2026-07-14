import { createElement } from "react";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  charges,
  customers,
  invoices,
  items,
  preferences,
  units,
} from "@/lib/db/schema";
import { InvoicePdf, type InvoiceLine } from "@/lib/pdf/invoice-pdf";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const invoiceId = Number.parseInt(id, 10);

  const invoice = db
    .select()
    .from(invoices)
    .where(eq(invoices.id, invoiceId))
    .get();
  if (!invoice) {
    return new Response("Rechnung nicht gefunden", { status: 404 });
  }

  const customer = db
    .select()
    .from(customers)
    .where(eq(customers.id, invoice.customerId))
    .get()!;
  const prefs = db.select().from(preferences).where(eq(preferences.id, 1)).get()!;

  const lines: InvoiceLine[] = db
    .select({
      date: charges.date,
      name: items.name,
      description: items.description,
      type: items.type,
      unitName: units.name,
      quantity: charges.quantity,
      rateCents: charges.rateCents,
      totalCents: charges.totalCents,
    })
    .from(charges)
    .innerJoin(items, eq(charges.itemId, items.id))
    .innerJoin(units, eq(items.unitId, units.id))
    .where(eq(charges.invoiceId, invoiceId))
    .orderBy(asc(charges.date), asc(charges.id))
    .all();

  const buffer = await renderToBuffer(
    createElement(InvoicePdf, {
      invoice,
      customer,
      prefs,
      lines,
    }) as React.ReactElement<DocumentProps>
  );

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Rechnung-${invoice.number}.pdf"`,
    },
  });
}
