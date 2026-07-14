import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { units } from "@/lib/db/schema";
import { UnitsClient } from "./units-client";

export const dynamic = "force-dynamic";

export default function EinheitenPage() {
  const allUnits = db.select().from(units).orderBy(asc(units.name)).all();

  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Einheiten</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Einheiten legen fest, wie Leistungen abgerechnet werden (z.&nbsp;B. Stunde, km).
      </p>
      <UnitsClient units={allUnits} />
    </div>
  );
}
