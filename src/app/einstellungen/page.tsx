import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { preferences } from "@/lib/db/schema";
import { PreferencesForm } from "./preferences-form";

export const dynamic = "force-dynamic";

export default function EinstellungenPage() {
  const prefs = db.select().from(preferences).where(eq(preferences.id, 1)).get()!;

  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Einstellungen</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Ihre Daten erscheinen auf jeder Rechnung.
      </p>
      <PreferencesForm prefs={prefs} />
    </div>
  );
}
