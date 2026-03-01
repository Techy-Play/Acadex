/**
 * @component ThemeProvider
 * @description Thin wrapper around `next-themes` ThemeProvider.
 * Mounted at the root layout to enable dark/light/system theme switching.
 */
"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
