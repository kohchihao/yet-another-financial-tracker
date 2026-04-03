"use client";

import { useCallback, useEffect, useState } from "react";
// TODO: Re-enable once auth is working
// import { useAction } from "convex/react";
// import { api } from "@/convex/_generated/api";

export interface PriceState {
  fetchedPrice: number | null;
  overridePrice: number | null;
  effectivePrice: number | null;
  fetchedAt: number | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setOverride: (price: number | null) => void;
}

export function usePrice(): PriceState {
  // TODO: Re-enable Convex action once auth is working
  // const fetchAction = useAction(api.prices.fetchCspxPrice);

  const [fetchedPrice, setFetchedPrice] = useState<number | null>(null);
  const [overridePrice, setOverridePriceState] = useState<number | null>(null);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    // TODO: Re-enable once auth is working
    // setIsLoading(true);
    // setError(null);
    // try {
    //   const result = await fetchAction({});
    //   setFetchedPrice(result.priceUSD);
    //   setFetchedAt(result.fetchedAt);
    // } catch (e) {
    //   setError(e instanceof Error ? e.message : "Failed to fetch price");
    // } finally {
    //   setIsLoading(false);
    // }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setOverride = useCallback((price: number | null) => {
    setOverridePriceState(price);
  }, []);

  const effectivePrice = overridePrice ?? fetchedPrice;

  return {
    fetchedPrice,
    overridePrice,
    effectivePrice,
    fetchedAt,
    isLoading,
    error,
    refresh,
    setOverride,
  };
}
