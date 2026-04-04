'use client';

import { api } from '@/convex/_generated/api';
import { useAction } from 'convex/react';
import { useCallback, useEffect, useState } from 'react';

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
  const fetchAction = useAction(api.prices.fetchCspxPrice);

  const [fetchedPrice, setFetchedPrice] = useState<number | null>(null);
  const [overridePrice, setOverridePriceState] = useState<number | null>(null);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchAction({});
      setFetchedPrice(result.priceUSD);
      setFetchedAt(result.fetchedAt);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch price');
    } finally {
      setIsLoading(false);
    }
  }, [fetchAction]);

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
