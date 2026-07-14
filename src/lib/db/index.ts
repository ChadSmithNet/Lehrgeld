import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import * as schema from "./schema";

function resolveDbPath(): string {
  if (process.env.LEHRGELD_DB_PATH) return process.env.LEHRGELD_DB_PATH;
  return path.join(
    os.homedir(),
    "Library",
    "Application Support",
    "Lehrgeld",
    "lehrgeld.db"
  );
}

// Copies the DB file aside before drizzle applies migrations that the
// database hasn't seen yet, so a failed upgrade can be rolled back by
// renaming one file.
function backupIfPendingMigrations(
  sqlite: Database.Database,
  dbPath: string,
  migrationsFolder: string
) {
  const journalPath = path.join(migrationsFolder, "meta", "_journal.json");
  if (!fs.existsSync(journalPath)) return;
  const journal = JSON.parse(fs.readFileSync(journalPath, "utf8")) as {
    entries: unknown[];
  };
  const total = journal.entries.length;
  if (total === 0) return;

  let applied = 0;
  try {
    const row = sqlite
      .prepare('SELECT count(*) AS c FROM "__drizzle_migrations"')
      .get() as { c: number };
    applied = row.c;
  } catch {
    applied = 0;
  }
  if (applied >= total) return;

  // Fresh, empty database: nothing worth backing up.
  const hasUserTables = sqlite
    .prepare(
      "SELECT count(*) AS c FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"
    )
    .get() as { c: number };
  if (hasUserTables.c === 0) return;

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  sqlite.prepare("VACUUM INTO ?").run(`${dbPath}.backup-${stamp}`);
}

function seed(db: ReturnType<typeof drizzle<typeof schema>>) {
  db.insert(schema.preferences)
    .values({ id: 1 })
    .onConflictDoNothing()
    .run();

  const unitCount = db.select().from(schema.units).all().length;
  if (unitCount === 0) {
    db.insert(schema.units)
      .values([{ name: "Stunde" }, { name: "Einheit (45 Min)" }, { name: "km" }])
      .run();
  }
}

function createDb() {
  const dbPath = resolveDbPath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  const migrationsFolder = path.join(process.cwd(), "drizzle");
  backupIfPendingMigrations(sqlite, dbPath, migrationsFolder);

  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder });
  seed(db);
  return db;
}

// Cached on globalThis so Next.js dev-mode HMR reuses one connection.
const globalForDb = globalThis as unknown as {
  lehrgeldDb?: ReturnType<typeof createDb>;
};

export const db = globalForDb.lehrgeldDb ?? (globalForDb.lehrgeldDb = createDb());
