import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema";
import { CustomersClient } from "./customers-client";

export const dynamic = "force-dynamic";

export default function KundenPage() {
  const allCustomers = db
    .select()
    .from(customers)
    .orderBy(asc(customers.name))
    .all();

  return (
    <div className="max-w-4xl">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Kunden</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Kunden, für die Leistungen erbracht und Rechnungen gestellt werden.
      </p>
      <CustomersClient customers={allCustomers} />
    </div>
  );
}
