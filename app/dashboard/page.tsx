'use client';
import { useConvexAuth } from 'convex/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { DashboardShell } from '@/components/dashboard/DashboardShell';

export default function Home() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();
  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/sign-in');
  }, [isAuthenticated, isLoading, router]);
  if (isLoading || !isAuthenticated) return null;

  return <DashboardShell />;
}
