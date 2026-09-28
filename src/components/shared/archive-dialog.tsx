"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export interface ArchiveOutcome {
  status: "ok" | "error";
  message?: string;
}

interface ArchiveDialogProps {
  triggerLabel?: string;
  title: string;
  description: string;
  onConfirm: () => Promise<ArchiveOutcome>;
}

/**
 * Shared confirmation dialog for logical archiving (clients today; devices and work orders
 * reuse this in later phases). Cancel never issues a request. A rejected archive (409, or any
 * other NestJS error) keeps the dialog open with the message NestJS returned — the record is
 * never removed from the list optimistically.
 */
export function ArchiveDialog({ triggerLabel = "Archivar", title, description, onConfirm }: ArchiveDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setPending(true);
    const outcome = await onConfirm();
    setPending(false);

    if (outcome.status === "error") {
      setError(outcome.message ?? "No se pudo archivar el registro.");
      return;
    }

    setOpen(false);
    setError(null);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <DialogTrigger render={<Button type="button" variant="destructive" />}>{triggerLabel}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button type="button" variant="destructive" onClick={handleConfirm} disabled={pending}>
            {pending ? "Archivando..." : "Confirmar archivado"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
