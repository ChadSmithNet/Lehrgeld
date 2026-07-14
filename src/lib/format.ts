export function formatCents(cents: number, currency: string): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

export function formatQuantity(quantity: number): string {
  return new Intl.NumberFormat("de-DE", {
    maximumFractionDigits: 2,
  }).format(quantity);
}

// "2026-07-14" -> "14.07.2026"
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}.${month}.${year}`;
}

export const MONTH_NAMES = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
] as const;

export function formatMonth(year: number, month: number): string {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

// Parses German decimal input ("1,5") as well as "1.5"; NaN if invalid.
export function parseQuantity(input: string): number {
  return Number.parseFloat(input.trim().replace(",", "."));
}

// Parses a first-invoice-number setting like "2026-015" into its parts;
// null for anything that isn't <year>-<sequence>.
export function parseInvoiceNumber(
  input: string
): { year: number; seq: number } | null {
  const match = /^(\d{4})-(\d{1,4})$/.exec(input.trim());
  if (!match) return null;
  return { year: Number(match[1]), seq: Number(match[2]) };
}

// Parses a rate like "45,00" into cents, avoiding float drift.
export function parseRateToCents(input: string): number {
  const normalized = input.trim().replace(/\./g, "").replace(",", ".");
  const value = Number.parseFloat(normalized);
  if (Number.isNaN(value)) return NaN;
  return Math.round(value * 100);
}
