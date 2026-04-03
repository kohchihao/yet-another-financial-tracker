"use client";

import { useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { parseCsv, generateTemplate, type CsvRow, type ParseError } from "@/lib/csv";

export function ImportDialog() {
  const [open, setOpen] = useState(false);
  const [valid, setValid] = useState<CsvRow[]>([]);
  const [errors, setErrors] = useState<ParseError[]>([]);
  const [importing, setImporting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const importMutation = useMutation(api.transactions.importTransactions);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSuccessMsg(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const result = parseCsv(text);
      setValid(result.valid);
      setErrors(result.errors);
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    if (valid.length === 0) return;
    setImporting(true);
    try {
      const result = await importMutation({ rows: valid });
      setSuccessMsg(`${result.inserted} transactions imported successfully.`);
      setValid([]);
      setErrors([]);
      if (fileRef.current) fileRef.current.value = "";
    } catch (e) {
      setErrors([{ row: 0, reason: e instanceof Error ? e.message : "Import failed" }]);
    } finally {
      setImporting(false);
    }
  }

  function downloadTemplate() {
    const blob = new Blob([generateTemplate()], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cspx-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleClose(o: boolean) {
    setOpen(o);
    if (!o) {
      setValid([]);
      setErrors([]);
      setSuccessMsg(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger className={buttonVariants({ variant: "outline", size: "sm" })}>
        <Upload className="h-4 w-4 mr-1" />
        Import CSV
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Transactions</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <Button variant="link" size="sm" className="p-0 h-auto" onClick={downloadTemplate}>
            Download template CSV
          </Button>

          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            onChange={handleFile}
            className="block w-full text-sm text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-input file:text-sm file:bg-background file:cursor-pointer"
          />

          {successMsg && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
              {successMsg}
            </p>
          )}

          {(valid.length > 0 || errors.length > 0) && (
            <div className="space-y-2">
              {valid.length > 0 && errors.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  {valid.length} valid row{valid.length !== 1 ? "s" : ""} ready to import.
                </p>
              )}
              {errors.length > 0 && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 space-y-1 max-h-48 overflow-y-auto">
                  <p className="text-xs font-medium text-destructive">
                    {errors.length} error{errors.length !== 1 ? "s" : ""} found:
                  </p>
                  {errors.map((err, i) => (
                    <p key={i} className="text-xs text-destructive/80">
                      {err.row > 0 ? `Row ${err.row}: ` : ""}{err.reason}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          <Button
            onClick={handleImport}
            disabled={valid.length === 0 || errors.length > 0 || importing}
            className="w-full"
          >
            {importing ? "Importing..." : `Import ${valid.length} Transaction${valid.length !== 1 ? "s" : ""}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
