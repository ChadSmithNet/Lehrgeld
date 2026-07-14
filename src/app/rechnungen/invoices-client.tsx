"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteInvoice, generateInvoice } from "@/lib/actions/invoices";
import type { Customer } from "@/lib/db/schema";
import { formatCents, formatDate, formatMonth } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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

type InvoiceRow = {
  id: number;
  number: string;
  customerName: string;
  year: number;
  month: number;
  issueDate: string;
  totalCents: number;
};

type OpenCharge = {
  id: number;
  date: string;
  customerId: number;
  itemName: string;
  totalCents: number;
};

function currentMonthValue(): string {
  return new Date().toISOString().slice(0, 7);
}

export function InvoicesClient({
  invoices,
  openCharges,
  customers,
  currency,
}: {
  invoices: InvoiceRow[];
  openCharges: OpenCharge[];
  customers: Customer[];
  currency: string;
}) {
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [monthValue, setMonthValue] = useState(currentMonthValue());
  const [pending, startTransition] = useTransition();

  // Months that actually contain open charges, plus the current month.
  const monthOptions = useMemo(() => {
    const set = new Set(openCharges.map((c) => c.date.slice(0, 7)));
    set.add(currentMonthValue());
    return [...set].sort().reverse();
  }, [openCharges]);

  const [year, month] = monthValue
    ? [Number(monthValue.slice(0, 4)), Number(monthValue.slice(5, 7))]
    : [0, 0];

  const preview = openCharges.filter(
    (c) =>
      c.customerId === Number(customerId) && c.date.startsWith(monthValue)
  );
  const previewTotal = preview.reduce((sum, c) => sum + c.totalCents, 0);

  function generate() {
    startTransition(async () => {
      const result = await generateInvoice({
        customerId: Number(customerId) || 0,
        year,
        month,
      });
      if (result.ok) {
        toast.success("Rechnung erstellt.");
        if (result.invoiceId) {
          window.open(`/api/rechnungen/${result.invoiceId}/pdf`, "_blank");
        }
      } else {
        toast.error(result.error);
      }
    });
  }

  function remove(invoice: InvoiceRow) {
    startTransition(async () => {
      const result = await deleteInvoice(invoice.id);
      if (result.ok) {
        toast.success(
          `Rechnung ${invoice.number} gelöscht, Buchungen wieder offen.`
        );
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <Card>
        <CardHeader>
          <CardTitle>Neue Monatsrechnung</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-2">
              <Label>Kunde</Label>
              <Select
                value={customerId}
                onValueChange={(v) => setCustomerId(v)}
                items={customers.map((c) => ({
                  value: String(c.id),
                  label: c.name,
                }))}
              >
                <SelectTrigger className="w-56">
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
            <div className="flex flex-col gap-2">
              <Label>Monat</Label>
              <Select
                value={monthValue}
                onValueChange={(v) => setMonthValue(v ?? currentMonthValue())}
                items={monthOptions.map((m) => ({
                  value: m,
                  label: formatMonth(Number(m.slice(0, 4)), Number(m.slice(5, 7))),
                }))}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((m) => (
                    <SelectItem key={m} value={m}>
                      {formatMonth(Number(m.slice(0, 4)), Number(m.slice(5, 7)))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={generate}
              disabled={pending || !customerId || preview.length === 0}
            >
              Rechnung erstellen
            </Button>
          </div>

          {customerId ? (
            preview.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Datum</TableHead>
                      <TableHead>Leistung</TableHead>
                      <TableHead className="text-right">Betrag</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="tabular-nums">
                          {formatDate(c.date)}
                        </TableCell>
                        <TableCell>{c.itemName}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCents(c.totalCents, currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={2} className="font-medium">
                        Gesamtbetrag (
                        {preview.length === 1
                          ? "1 Buchung"
                          : `${preview.length} Buchungen`}
                        )
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatCents(previewTotal, currency)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Keine offenen Buchungen für diesen Kunden in{" "}
                {formatMonth(year, month)}.
              </p>
            )
          ) : null}
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Erstellte Rechnungen</h2>
        {invoices.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Noch keine Rechnungen erstellt.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nummer</TableHead>
                <TableHead>Kunde</TableHead>
                <TableHead>Zeitraum</TableHead>
                <TableHead>Rechnungsdatum</TableHead>
                <TableHead className="text-right">Betrag</TableHead>
                <TableHead className="w-44 text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium tabular-nums">
                    {invoice.number}
                  </TableCell>
                  <TableCell>{invoice.customerName}</TableCell>
                  <TableCell>{formatMonth(invoice.year, invoice.month)}</TableCell>
                  <TableCell className="tabular-nums">
                    {formatDate(invoice.issueDate)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCents(invoice.totalCents, currency)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        nativeButton={false}
                        render={
                          <a
                            href={`/api/rechnungen/${invoice.id}/pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                          />
                        }
                      >
                        PDF
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger
                          render={
                            <Button variant="outline" size="sm" disabled={pending} />
                          }
                        >
                          Löschen
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Rechnung {invoice.number} löschen?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Die zugehörigen Buchungen werden wieder als offen
                              markiert und können erneut abgerechnet werden.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                            <AlertDialogAction onClick={() => remove(invoice)}>
                              Löschen
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
