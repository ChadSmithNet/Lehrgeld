import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Single-row table (id = 1): data of the freelancer using the app.
export const preferences = sqliteTable("preferences", {
  id: integer("id").primaryKey(),
  name: text("name").notNull().default(""),
  businessName: text("business_name").notNull().default(""),
  address: text("address").notNull().default(""),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull().default(""),
  iban: text("iban").notNull().default(""),
  currency: text("currency").notNull().default("EUR"),
  vatNote: text("vat_note")
    .notNull()
    .default("Gemäß § 19 UStG wird keine Umsatzsteuer berechnet."),
  // "2026-015" lets numbering start mid-year when earlier invoices were
  // written outside the app; empty means each year starts at -001.
  firstInvoiceNumber: text("first_invoice_number").notNull().default(""),
});

export const customers = sqliteTable("customers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  // Full legal/registered name for invoices; the display "name" may be shorter.
  // Required in the UI; the DB default only covers the migration backfill.
  legalName: text("legal_name").notNull().default(""),
  addressee: text("addressee").notNull().default(""),
  address: text("address").notNull().default(""),
  email: text("email").notNull().default(""),
});

export const units = sqliteTable("units", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
});

export const items = sqliteTable("items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customers.id),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  // Internal note shown when picking the item for a charge; never printed.
  note: text("note").notNull().default(""),
  type: text("type", { enum: ["course", "expense"] }).notNull(),
  rateCents: integer("rate_cents").notNull(),
  unitId: integer("unit_id")
    .notNull()
    .references(() => units.id),
});

export const invoices = sqliteTable("invoices", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customers.id),
  year: integer("year").notNull(),
  month: integer("month").notNull(),
  number: text("number").notNull().unique(),
  issueDate: text("issue_date").notNull(),
  totalCents: integer("total_cents").notNull(),
  // Recipient frozen at creation time so later customer edits never change
  // historical invoices. The PDF renders from these, not the live customer.
  customerName: text("customer_name").notNull().default(""),
  customerLegalName: text("customer_legal_name").notNull().default(""),
  customerAddressee: text("customer_addressee").notNull().default(""),
  customerAddress: text("customer_address").notNull().default(""),
});

export const charges = sqliteTable("charges", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customers.id),
  itemId: integer("item_id")
    .notNull()
    .references(() => items.id),
  quantity: real("quantity").notNull(),
  // Rate is snapshotted from the item when the charge is booked, so later
  // rate edits never change existing charges or invoices.
  rateCents: integer("rate_cents").notNull(),
  totalCents: integer("total_cents").notNull(),
  invoiceId: integer("invoice_id").references(() => invoices.id),
});

export type Preferences = typeof preferences.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Unit = typeof units.$inferSelect;
export type Item = typeof items.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type Charge = typeof charges.$inferSelect;
