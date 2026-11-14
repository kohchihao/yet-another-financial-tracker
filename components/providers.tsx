"use client";

import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PrivacyProvider } from "@/context/PrivacyContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <PrivacyProvider>{children}</PrivacyProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}
