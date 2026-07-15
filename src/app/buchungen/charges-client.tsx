"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  createCharge,
  deleteCharge,
  updateCharge,
} from "@/lib/actions/charges";
import type { Customer, Item, Unit } from "@/lib/db/schema";
import {
  formatCents,
  formatDate,
  formatMonth,
  formatQuantity,
  parseQuantity,
  parseRateToCents,
} from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type ChargeRow = {
  id: number;
  date: string;
  customerId: number;
  customerName: string;
  itemId: number;
  itemName: string;
  itemType: "course" | "expense";
  unitName: string;
  quantity: number;
  rateCents: number;
  totalCents: number;
  invoiceId: number | null;
  invoiceNumber: string | null;
};

type ChargeForm = {
  date: string;
  customerId: string | null;
  itemId: string | null;
  quantity: string;
  rate: string;
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatRate(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

export function ChargesClient({
  rows,
  customers,
  items,
  units,
  currency,
}: {
  rows: ChargeRow[];
  customers: Customer[];
  items: Item[];
  units: Unit[];
  currency: string;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ChargeRow | null>(null);
  const [form, setForm] = useState<ChargeForm>({
    date: today(),
    customerId: null,
    itemId: null,
    quantity: "",
    rate: "",
  });
  const [customerFilter, setCustomerFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pending, startTransition] = useTransition();

  const unitName = useMemo(() => new Map(units.map((u) => [u.id, u.name])), [units]);

  const months = useMemo(() => {
    const set = new Set(rows.map((r) => r.date.slice(0, 7)));
    return [...set].sort().reverse();
  }, [rows]);

  const visibleRows = rows.filter((r) => {
    if (customerFilter !== "all" && r.customerId !== Number(customerFilter)) return false;
    if (monthFilter !== "all" && !r.date.startsWith(monthFilter)) return false;
    if (statusFilter === "open" && r.invoiceId !== null) return false;
    if (statusFilter === "billed" && r.invoiceId === null) return false;
    return true;
  });

  const customerItems = items.filter(
    (i) => i.customerId === Number(form.customerId)
  );
  const selectedItem = items.find((i) => i.id === Number(form.itemId)) ?? null;

  // Live preview from the form's own rate, which defaults to the item's rate
  // but can be overridden.
  const previewRateCents = parseRateToCents(form.rate);
  const previewQuantity = parseQuantity(form.quantity);
  const previewTotal =
    !Number.isNaN(previewRateCents) &&
    previewRateCents >= 0 &&
    !Number.isNaN(previewQuantity) &&
    previewQuantity > 0
      ? Math.round(previewRateCents * previewQuantity)
      : null;

  function set<K extends keyof ChargeForm>(key: K, value: ChargeForm[K]) {
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (key === "customerId") {
        next.itemId = null;
        next.rate = "";
      }
      // Picking or switching the item prefills the rate with that item's
      // current rate; the user can then override it.
      if (key === "itemId") {
        const item = items.find((i) => i.id === Number(value));
        next.rate = item ? formatRate(item.rateCents) : "";
      }
      return next;
    });
  }

  function openCreate() {
    setEditing(null);
    setForm({
      date: today(),
      customerId: customerFilter !== "all" ? customerFilter : null,
      itemId: null,
      quantity: "",
      rate: "",
    });
    setDialogOpen(true);
  }

  function openEdit(row: ChargeRow) {
    setEditing(row);
    setForm({
      date: row.date,
      customerId: String(row.customerId),
      itemId: String(row.itemId),
      quantity: formatQuantity(row.quantity),
      rate: formatRate(row.rateCents),
    });
    setDialogOpen(true);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const quantity = parseQuantity(form.quantity);
    if (Number.isNaN(quantity) || quantity <= 0) {
      toast.error("Bitte eine gültige Anzahl größer 0 eingeben.");
      return;
    }
    const rateCents = parseRateToCents(form.rate);
    if (Number.isNaN(rateCents) || rateCents < 0) {
      toast.error("Bitte einen gültigen Satz eingeben (z. B. 45,00).");
      return;
    }
    const input = {
      date: form.date,
      customerId: Number(form.customerId) || 0,
      itemId: Number(form.itemId) || 0,
      quantity,
      rateCents,
    };
    startTransition(async () => {
      const result = editing
        ? await updateCharge(editing.id, input)
        : await createCharge(input);
      if (result.ok) {
        toast.success(editing ? "Buchung aktualisiert." : "Buchung erfasst.");
        setDialogOpen(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  function remove(row: ChargeRow) {
    startTransition(async () => {
      const result = await deleteCharge(row.id);
      if (result.ok) toast.success("Buchung gelöscht.");
      else toast.error(result.error);
    });
  }

  const visibleTotal = visibleRows.reduce((sum, r) => sum + r.totalCents, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button onClick={openCreate} />}>
            Neue Buchung
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editing ? "Buchung bearbeiten" : "Neue Buchung"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={submit} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="ch-date">Datum</Label>
                  <Input
                    id="ch-date"
                    type="date"
                    value={form.date}
                    onChange={(e) => set("date", e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Kunde</Label>
                  <Select
                    value={form.customerId}
                    onValueChange={(v) => set("customerId", v)}
                    items={customers.map((c) => ({
                      value: String(c.id),
                      label: c.name,
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Kunde wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Leistung (Kurs oder Auslage)</Label>
                <Select
                  value={form.itemId}
                  onValueChange={(v) => set("itemId", v)}
                  disabled={!form.customerId}
                  items={customerItems.map((i) => ({
                    value: String(i.id),
                    label: i.name,
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        form.customerId
                          ? customerItems.length > 0
                            ? "Leistung wählen"
                            : "Keine Leistungen für diesen Kunden"
                          : "Zuerst Kunde wählen"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {customerItems.map((i) => (
                      <SelectItem key={i.id} value={String(i.id)}>
                        <div className="flex flex-col">
                          <span>
                            {i.type === "course" ? "Kurs" : "Auslage"}: {i.name} (
                            {formatCents(i.rateCents, currency)} /{" "}
                            {unitName.get(i.unitId)})
                          </span>
                          {i.note ? (
                            <span className="text-xs text-muted-foreground whitespace-normal">
                              {i.note}
                            </span>
                          ) : null}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="ch-qty">
                    Anzahl{selectedItem ? ` (${unitName.get(selectedItem.unitId)})` : ""}
                  </Label>
                  <Input
                    id="ch-qty"
                    value={form.quantity}
                    onChange={(e) => set("quantity", e.target.value)}
                    placeholder="z. B. 1,5"
                    inputMode="decimal"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="ch-rate">Satz ({currency})</Label>
                  <Input
                    id="ch-rate"
                    value={form.rate}
                    onChange={(e) => set("rate", e.target.value)}
                    placeholder="45,00"
                    inputMode="decimal"
                    disabled={!form.itemId}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Betrag</Label>
                  <div className="flex h-9 items-center rounded-md border bg-muted px-3 text-sm tabular-nums">
                    {previewTotal !== null
                      ? formatCents(previewTotal, currency)
                      : "—"}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={pending}>
                  Speichern
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={customerFilter}
            onValueChange={(v) => setCustomerFilter(v ?? "all")}
            items={[
              { value: "all", label: "Alle Kunden" },
              ...customers.map((c) => ({ value: String(c.id), label: c.name })),
            ]}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Kunden</SelectItem>
              {customers.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={monthFilter}
            onValueChange={(v) => setMonthFilter(v ?? "all")}
            items={[
              { value: "all", label: "Alle Monate" },
              ...months.map((m) => ({
                value: m,
                label: formatMonth(Number(m.slice(0, 4)), Number(m.slice(5, 7))),
              })),
            ]}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Monate</SelectItem>
              {months.map((m) => (
                <SelectItem key={m} value={m}>
                  {formatMonth(Number(m.slice(0, 4)), Number(m.slice(5, 7)))}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v ?? "all")}
            items={[
              { value: "all", label: "Alle Buchungen" },
              { value: "open", label: "Offen" },
              { value: "billed", label: "Abgerechnet" },
            ]}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Buchungen</SelectItem>
              <SelectItem value="open">Offen</SelectItem>
              <SelectItem value="billed">Abgerechnet</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {visibleRows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Keine Buchungen vorhanden.
        </p>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Datum</TableHead>
                <TableHead>Kunde</TableHead>
                <TableHead>Art</TableHead>
                <TableHead>Leistung</TableHead>
                <TableHead className="text-right">Anzahl</TableHead>
                <TableHead className="text-right">Satz</TableHead>
                <TableHead className="text-right">Betrag</TableHead>
                <TableHead>Rechnung</TableHead>
                <TableHead className="w-40 text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleRows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="tabular-nums">
                    {formatDate(row.date)}
                  </TableCell>
                  <TableCell>{row.customerName}</TableCell>
                  <TableCell>
                    <Badge
                      variant={row.itemType === "course" ? "default" : "secondary"}
                    >
                      {row.itemType === "course" ? "Kurs" : "Auslage"}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{row.itemName}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatQuantity(row.quantity)} {row.unitName}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCents(row.rateCents, currency)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCents(row.totalCents, currency)}
                  </TableCell>
                  <TableCell>
                    {row.invoiceNumber ? (
                      <Link
                        href="/rechnungen"
                        className="text-sm underline underline-offset-2"
                      >
                        {row.invoiceNumber}
                      </Link>
                    ) : (
                      <span className="text-sm text-muted-foreground">offen</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {row.invoiceId === null ? (
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEdit(row)}
                        >
                          Bearbeiten
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={pending}
                          onClick={() => remove(row)}
                        >
                          Löschen
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        abgerechnet
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="text-right text-sm text-muted-foreground">
            Summe der angezeigten Buchungen:{" "}
            <span className="font-medium text-foreground tabular-nums">
              {formatCents(visibleTotal, currency)}
            </span>
          </p>
        </>
      )}
    </div>
  );
}
