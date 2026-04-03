"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw } from "lucide-react";
import { formatUSD } from "@/lib/calculations";
import type { PriceState } from "@/hooks/usePrice";

interface PriceCardProps {
  priceState: PriceState;
}

export function PriceCard({ priceState }: PriceCardProps) {
  const {
    effectivePrice,
    fetchedAt,
    isLoading,
    error,
    refresh,
    setOverride,
    overridePrice,
  } = priceState;

  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function applyOverride() {
    const parsed = parseFloat(inputValue);
    if (!isNaN(parsed) && parsed > 0) {
      setOverride(parsed);
    } else if (inputValue === "") {
      setOverride(null);
    }
  }

  function clearOverride() {
    setInputValue("");
    setOverride(null);
    inputRef.current?.blur();
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            CSPX Price (USD)
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={refresh}
            disabled={isLoading}
            aria-label="Refresh price"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-2xl font-bold tabular-nums">
          {effectivePrice !== null ? formatUSD(effectivePrice) : "—"}
          {overridePrice !== null && (
            <span className="ml-2 text-xs font-normal text-amber-600 dark:text-amber-400">
              override
            </span>
          )}
        </div>
        {fetchedAt && (
          <p className="text-xs text-muted-foreground">
            Fetched {new Date(fetchedAt).toLocaleTimeString()}
          </p>
        )}
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex gap-1.5">
          <Input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            placeholder="Override price..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={applyOverride}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyOverride();
              if (e.key === "Escape") clearOverride();
            }}
            className="h-7 text-sm"
          />
          {overridePrice !== null && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={clearOverride}
            >
              Clear
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
