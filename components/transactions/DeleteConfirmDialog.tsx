"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

interface DeleteConfirmDialogProps {
  transactionId: Id<"transactions"> | null;
  onClose: () => void;
}

export function DeleteConfirmDialog({
  transactionId,
  onClose,
}: DeleteConfirmDialogProps) {
  const deleteTransaction = useMutation(api.transactions.deleteTransaction);

  async function handleConfirm() {
    if (!transactionId) return;
    await deleteTransaction({ id: transactionId });
    onClose();
  }

  return (
    <AlertDialog open={transactionId !== null} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete transaction?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this transaction? This cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
