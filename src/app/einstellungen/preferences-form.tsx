"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updatePreferences } from "@/lib/actions/preferences";
import type { Preferences } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CURRENCIES = ["EUR", "CHF", "USD", "GBP"];

export function PreferencesForm({ prefs }: { prefs: Preferences }) {
  const [form, setForm] = useState({
    name: prefs.name,
    businessName: prefs.businessName,
    address: prefs.address,
    email: prefs.email,
    phone: prefs.phone,
    iban: prefs.iban,
    currency: prefs.currency,
    vatNote: prefs.vatNote,
    firstInvoiceNumber: prefs.firstInvoiceNumber,
  });
  const [pending, startTransition] = useTransition();

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updatePreferences(form);
      if (result.ok) toast.success("Einstellungen gespeichert.");
      else toast.error(result.error);
    });
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="businessName">Firmenname</Label>
              <Input
                id="businessName"
                value={form.businessName}
                onChange={(e) => set("businessName", e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="address">Anschrift</Label>
            <Textarea
              id="address"
              rows={3}
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              placeholder={"Straße Hausnummer\nPLZ Ort"}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">E-Mail</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="phone">Telefon</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="iban">IBAN</Label>
              <Input
                id="iban"
                value={form.iban}
                onChange={(e) => set("iban", e.target.value)}
                placeholder="DE00 0000 0000 0000 0000 00"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="currency">Währung</Label>
              <Select
                value={form.currency}
                onValueChange={(v) => set("currency", v ?? "EUR")}
              >
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="vatNote">Umsatzsteuer-Hinweis (erscheint auf Rechnungen)</Label>
            <Textarea
              id="vatNote"
              rows={2}
              value={form.vatNote}
              onChange={(e) => set("vatNote", e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="firstInvoiceNumber">Erste Rechnungsnummer</Label>
            <Input
              id="firstInvoiceNumber"
              value={form.firstInvoiceNumber}
              onChange={(e) => set("firstInvoiceNumber", e.target.value)}
              placeholder="z. B. 2026-015"
            />
            <p className="text-xs text-muted-foreground">
              Für den Einstieg mitten im Jahr: Die erste in der App erstellte
              Rechnung dieses Jahres erhält diese Nummer. Leer lassen, um bei
              -001 zu beginnen. Andere Jahre sind nicht betroffen.
            </p>
          </div>
          <div>
            <Button type="submit" disabled={pending}>
              {pending ? "Speichern …" : "Speichern"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
