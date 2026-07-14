import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { customers, items, preferences, units } from "@/lib/db/schema";
import { ItemsClient } from "./items-client";

export const dynamic = "force-dynamic";

export default function LeistungenPage() {
  const allItems = db.select().from(items).orderBy(asc(items.name)).all();
  const allCustomers = db.select().from(customers).orderBy(asc(customers.name)).all();
  const allUnits = db.select().from(units).orderBy(asc(units.name)).all();
  const prefs = db.select().from(preferences).where(eq(preferences.id, 1)).get()!;

  return (
    <div className="max-w-5xl">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Leistungen</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Kurse und Auslagen je Kunde. Satzänderungen wirken nur auf künftige
        Buchungen — bestehende Buchungen und Rechnungen bleiben unverändert.
      </p>
      <ItemsClient
        items={allItems}
        customers={allCustomers}
        units={allUnits}
        currency={prefs.currency}
      />
    </div>
  );
}
