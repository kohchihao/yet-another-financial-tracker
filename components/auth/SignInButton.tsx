'use client';

import { Button } from '@/components/ui/button';
import { useAuthActions } from '@convex-dev/auth/react';

export function SignInButton() {
  const { signIn } = useAuthActions();
  return (
    <Button
      size="lg"
      onClick={() => signIn('github', { redirectTo: '/dashboard' })}
    >
      Sign in with GitHub
    </Button>
  );
}
