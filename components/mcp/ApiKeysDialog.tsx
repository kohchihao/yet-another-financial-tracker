"use client";

import { useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { Bot, Check, Copy } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const dateFormat = new Intl.DateTimeFormat("en-SG", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function formatDate(ms: number | null): string {
  return ms === null ? "Never" : dateFormat.format(new Date(ms));
}

function useCopy(): [boolean, (text: string) => Promise<void>] {
  const [copied, setCopied] = useState(false);
  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return [copied, copy];
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, copy] = useCopy();
  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      aria-label={label}
      onClick={() => void copy(text)}
    >
      {copied ? <Check /> : <Copy />}
    </Button>
  );
}

/**
 * Manage personal API keys for the MCP endpoint (/api/mcp).
 * A new key is shown exactly once; afterwards only its prefix is visible.
 */
export function ApiKeysDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const keys = useQuery(api.apiKeys.listApiKeys);
  const createApiKey = useAction(api.apiKeys.createApiKey);
  const revokeApiKey = useMutation(api.apiKeys.revokeApiKey);

  const endpoint =
    typeof window === "undefined" ? "/api/mcp" : `${window.location.origin}/api/mcp`;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const result = await createApiKey({ name: name.trim() });
      setNewKey(result.key);
      setName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create key");
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(id: Id<"apiKeys">) {
    if (!window.confirm("Revoke this key? Clients using it will stop working.")) return;
    await revokeApiKey({ id });
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setNewKey(null);
      setError(null);
      setName("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger className={buttonVariants({ variant: "outline", size: "sm" })}>
        <Bot className="size-4" />
        AI access
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>AI access (MCP)</DialogTitle>
          <DialogDescription>
            Let AI tools add purchases and read your transactions. Connect them
            to the endpoint below with an API key as a bearer token.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Endpoint</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded-md bg-muted px-2 py-1.5 text-xs">
                {endpoint}
              </code>
              <CopyButton text={endpoint} label="Copy endpoint" />
            </div>
          </div>

          {newKey ? (
            <div className="space-y-1.5 rounded-md border border-primary/40 p-3">
              <p className="text-xs font-medium">
                Copy your new key now — it won&apos;t be shown again.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 break-all rounded-md bg-muted px-2 py-1.5 text-xs">
                  {newKey}
                </code>
                <CopyButton text={newKey} label="Copy API key" />
              </div>
              <p className="text-xs text-muted-foreground">
                Header: <code>Authorization: Bearer {"<key>"}</code>
              </p>
            </div>
          ) : (
            <form onSubmit={handleCreate} className="flex items-center gap-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Key name, e.g. Claude Code"
                maxLength={64}
                aria-label="Key name"
              />
              <Button type="submit" size="sm" disabled={creating || !name.trim()}>
                {creating ? "Creating…" : "Create key"}
              </Button>
            </form>
          )}
          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Your keys</p>
            {keys === undefined ? (
              <p className="text-xs text-muted-foreground">Loading…</p>
            ) : keys.length === 0 ? (
              <p className="text-xs text-muted-foreground">No keys yet.</p>
            ) : (
              <ul className="divide-y rounded-md border">
                {keys.map((key) => (
                  <li key={key._id} className="flex items-center gap-3 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium">{key.name}</span>
                        {key.revokedAt !== null && (
                          <Badge variant="secondary">Revoked</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        <code>{key.prefix}…</code> · created {formatDate(key.createdAt)}
                        {" · "}last used {formatDate(key.lastUsedAt)}
                      </p>
                    </div>
                    {key.revokedAt === null && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => void handleRevoke(key._id)}
                      >
                        Revoke
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
