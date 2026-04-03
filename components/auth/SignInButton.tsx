"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/components/ui/button";

export function SignInButton() {
  const { signIn } = useAuthActions();
  return (
    <Button
      size="lg"
      onClick={() => signIn("github", { redirectTo: "/" })}
    >
      Sign in with GitHub
    </Button>
  );
}
