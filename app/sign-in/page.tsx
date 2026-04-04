'use client';

import { SignInButton } from '@/components/auth/SignInButton';
import { useConvexAuth } from 'convex/react';

export default function SignInPage() {
  const { isLoading } = useConvexAuth();

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] gap-6 px-4">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">CSPX Tracker</h1>
        <p className="text-sm text-muted-foreground">
          Personal investment tracker for IBKR
        </p>
      </div>
      {!isLoading && <SignInButton />}
    </div>
  );
}
