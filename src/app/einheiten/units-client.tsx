"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createUnit, deleteUnit, updateUnit } from "@/lib/actions/units";
import type { Unit } from "@/lib/db/schema";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function UnitsClient({ units }: { units: Unit[] }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Unit | null>(null);
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();

  function openCreate() {
    setEditing(null);
    setName("");
    setDialogOpen(true);
  }

  function openEdit(unit: Unit) {
    setEditing(unit);
    setName(unit.name);
    setDialogOpen(true);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = editing
        ? await updateUnit(editing.id, name)
        : await createUnit(name);
      if (result.ok) {
        toast.success(editing ? "Einheit aktualisiert." : "Einheit angelegt.");
        setDialogOpen(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  function remove(unit: Unit) {
    startTransition(async () => {
      const result = await deleteUnit(unit.id);
      if (result.ok) toast.success("Einheit gelöscht.");
      else toast.error(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button onClick={openCreate} />}>
            Neue Einheit
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editing ? "Einheit bearbeiten" : "Neue Einheit"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={submit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="unit-name">Name</Label>
                <Input
                  id="unit-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="z. B. Stunde"
                  autoFocus
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

      {units.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Noch keine Einheiten angelegt.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="w-40 text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {units.map((unit) => (
              <TableRow key={unit.id}>
                <TableCell>{unit.name}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(unit)}
                    >
                      Bearbeiten
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pending}
                      onClick={() => remove(unit)}
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
