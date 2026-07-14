"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { createItem, deleteItem, updateItem } from "@/lib/actions/items";
import type { Customer, Item, Unit } from "@/lib/db/schema";
import { formatCents, parseRateToCents } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

type ItemForm = {
  customerId: string | null;
  name: string;
  description: string;
  type: "course" | "expense";
  rate: string;
  unitId: string | null;
};

const EMPTY: ItemForm = {
  customerId: null,
  name: "",
  description: "",
  type: "course",
  rate: "",
  unitId: null,
};

export function ItemsClient({
  items,
  customers,
  units,
  currency,
}: {
  items: Item[];
  customers: Customer[];
  units: Unit[];
  currency: string;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [form, setForm] = useState<ItemForm>(EMPTY);
  const [customerFilter, setCustomerFilter] = useState<string>("all");
  const [pending, startTransition] = useTransition();

  const customerName = useMemo(
    () => new Map(customers.map((c) => [c.id, c.name])),
    [customers]
  );
  const unitName = useMemo(
    () => new Map(units.map((u) => [u.id, u.name])),
    [units]
  );

  const visibleItems =
    customerFilter === "all"
      ? items
      : items.filter((i) => i.customerId === Number(customerFilter));

  function set<K extends keyof ItemForm>(key: K, value: ItemForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function openCreate() {
    setEditing(null);
    setForm({
      ...EMPTY,
      customerId: customerFilter !== "all" ? customerFilter : null,
    });
    setDialogOpen(true);
  }

  function openEdit(item: Item) {
    setEditing(item);
    setForm({
      customerId: String(item.customerId),
      name: item.name,
      description: item.description,
      type: item.type,
      rate: (item.rateCents / 100).toFixed(2).replace(".", ","),
      unitId: String(item.unitId),
    });
    setDialogOpen(true);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const rateCents = parseRateToCents(form.rate);
    if (Number.isNaN(rateCents)) {
      toast.error("Bitte einen gültigen Satz eingeben (z. B. 45,00).");
      return;
    }
    const input = {
      customerId: Number(form.customerId) || 0,
      name: form.name,
      description: form.description,
      type: form.type,
      rateCents,
      unitId: Number(form.unitId) || 0,
    };
    startTransition(async () => {
      const result = editing
        ? await updateItem(editing.id, input)
        : await createItem(input);
      if (result.ok) {
        toast.success(editing ? "Leistung aktualisiert." : "Leistung angelegt.");
        setDialogOpen(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  function remove(item: Item) {
    startTransition(async () => {
      const result = await deleteItem(item.id);
      if (result.ok) toast.success("Leistung gelöscht.");
      else toast.error(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button onClick={openCreate} />}>
            Neue Leistung
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editing ? "Leistung bearbeiten" : "Neue Leistung"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={submit} className="flex flex-col gap-4">
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
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label>Art</Label>
                  <Select
                    value={form.type}
                    onValueChange={(v) => set("type", (v ?? "course") as ItemForm["type"])}
                    items={[
                      { value: "course", label: "Kurs" },
                      { value: "expense", label: "Auslage" },
                    ]}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="course">Kurs</SelectItem>
                      <SelectItem value="expense">Auslage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="i-name">Name</Label>
                  <Input
                    id="i-name"
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    placeholder="z. B. Business-Englisch B2"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="i-desc">Beschreibung</Label>
                <Textarea
                  id="i-desc"
                  rows={2}
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="i-rate">Satz pro Einheit ({currency})</Label>
                  <Input
                    id="i-rate"
                    value={form.rate}
                    onChange={(e) => set("rate", e.target.value)}
                    placeholder="45,00"
                    inputMode="decimal"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Einheit</Label>
                  <Select
                    value={form.unitId}
                    onValueChange={(v) => set("unitId", v)}
                    items={units.map((u) => ({
                      value: String(u.id),
                      label: u.name,
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Einheit wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map((u) => (
                        <SelectItem key={u.id} value={String(u.id)}>
                          {u.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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

        <div className="flex items-center gap-2">
          <Label className="text-muted-foreground">Kunde:</Label>
          <Select
            value={customerFilter}
            onValueChange={(v) => setCustomerFilter(v ?? "all")}
            items={[
              { value: "all", label: "Alle Kunden" },
              ...customers.map((c) => ({ value: String(c.id), label: c.name })),
            ]}
          >
            <SelectTrigger className="w-56">
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
        </div>
      </div>

      {visibleItems.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Keine Leistungen vorhanden. Legen Sie zunächst Kunden und Einheiten an.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kunde</TableHead>
              <TableHead>Art</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Beschreibung</TableHead>
              <TableHead className="text-right">Satz</TableHead>
              <TableHead>Einheit</TableHead>
              <TableHead className="w-40 text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{customerName.get(item.customerId)}</TableCell>
                <TableCell>
                  <Badge variant={item.type === "course" ? "default" : "secondary"}>
                    {item.type === "course" ? "Kurs" : "Auslage"}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell className="max-w-64 truncate text-muted-foreground">
                  {item.description}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCents(item.rateCents, currency)}
                </TableCell>
                <TableCell>{unitName.get(item.unitId)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(item)}
                    >
                      Bearbeiten
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pending}
                      onClick={() => remove(item)}
                    >
                      Löschen
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
