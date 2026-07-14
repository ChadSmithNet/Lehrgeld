"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  createCustomer,
  deleteCustomer,
  updateCustomer,
  type CustomerInput,
} from "@/lib/actions/customers";
import type { Customer } from "@/lib/db/schema";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const EMPTY: CustomerInput = { name: "", addressee: "", address: "", email: "" };

export function CustomersClient({ customers }: { customers: Customer[] }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState<CustomerInput>(EMPTY);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof CustomerInput>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setDialogOpen(true);
  }

  function openEdit(customer: Customer) {
    setEditing(customer);
    setForm({
      name: customer.name,
      addressee: customer.addressee,
      address: customer.address,
      email: customer.email,
    });
    setDialogOpen(true);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = editing
        ? await updateCustomer(editing.id, form)
        : await createCustomer(form);
      if (result.ok) {
        toast.success(editing ? "Kunde aktualisiert." : "Kunde angelegt.");
        setDialogOpen(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  function remove(customer: Customer) {
    startTransition(async () => {
      const result = await deleteCustomer(customer.id);
      if (result.ok) toast.success("Kunde gelöscht.");
      else toast.error(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button onClick={openCreate} />}>
            Neuer Kunde
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editing ? "Kunde bearbeiten" : "Neuer Kunde"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={submit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="c-name">Name</Label>
                <Input
                  id="c-name"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="z. B. Sprachschule Müller GmbH"
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="c-addressee">Ansprechpartner / Adressat</Label>
                <Input
                  id="c-addressee"
                  value={form.addressee}
                  onChange={(e) => set("addressee", e.target.value)}
                  placeholder="z. B. Frau Anna Müller"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="c-address">Anschrift</Label>
                <Textarea
                  id="c-address"
                  rows={3}
                  value={form.address}
                  onChange={(e) => set("address", e.target.value)}
                  placeholder={"Straße Hausnummer\nPLZ Ort"}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="c-email">E-Mail</Label>
                <Input
                  id="c-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={pending}>
                  Speichern
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {customers.length === 0 ? (
        <p className="text-sm text-muted-foreground">Noch keine Kunden angelegt.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Adressat</TableHead>
              <TableHead>Anschrift</TableHead>
              <TableHead>E-Mail</TableHead>
              <TableHead className="w-40 text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell className="font-medium">{customer.name}</TableCell>
                <TableCell>{customer.addressee}</TableCell>
                <TableCell className="whitespace-pre-line">
                  {customer.address}
                </TableCell>
                <TableCell>{customer.email}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(customer)}
                    >
                      Bearbeiten
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pending}
                      onClick={() => remove(customer)}
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
