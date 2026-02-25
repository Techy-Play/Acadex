"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ACCENT_COLORS = [
  { name: "Default", value: "default", color: "bg-gray-800 dark:bg-gray-200" },
  { name: "Pink", value: "pink", color: "bg-pink-500" },
  { name: "Magenta", value: "magenta", color: "bg-fuchsia-600" },
  { name: "Cyan", value: "cyan", color: "bg-cyan-500" },
  { name: "Navy", value: "navy", color: "bg-blue-900" },
  { name: "Emerald", value: "emerald", color: "bg-emerald-500" },
  { name: "Sunset", value: "sunset", color: "bg-orange-500" },
  { name: "Purple", value: "purple", color: "bg-purple-600" },
];

function SunIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}

function MoonIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

function MonitorIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect width="20" height="14" x="2" y="3" rx="2" /><line x1="8" x2="16" y1="21" y2="21" /><line x1="12" x2="12" y1="17" y2="21" />
    </svg>
  );
}

function PaletteIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" /><circle cx="17.5" cy="10.5" r=".5" fill="currentColor" /><circle cx="8.5" cy="7.5" r=".5" fill="currentColor" /><circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
    </svg>
  );
}

function applyAccent(value: string) {
  const html = document.documentElement;
  if (value === "default") {
    html.removeAttribute("data-accent");
  } else {
    html.setAttribute("data-accent", value);
  }
}

async function saveThemeToServer(theme?: string, accentColor?: string) {
  try {
    const body: Record<string, string> = {};
    if (theme) body.theme = theme;
    if (accentColor) body.accentColor = accentColor;
    await fetch("/api/profile/update-theme", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    // silently fail — localStorage is fallback
  }
}

export function useAccentColor() {
  const [accent, setAccentState] = React.useState<string>("default");
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    const saved = localStorage.getItem("section-c-accent") || "default";
    setAccentState(saved);
    applyAccent(saved);
    setLoaded(true);
  }, []);

  const setAccent = React.useCallback((value: string) => {
    setAccentState(value);
    localStorage.setItem("section-c-accent", value);
    applyAccent(value);
    saveThemeToServer(undefined, value);
  }, []);

  const initFromServer = React.useCallback((serverAccent: string) => {
    if (serverAccent && serverAccent !== "default") {
      setAccentState(serverAccent);
      localStorage.setItem("section-c-accent", serverAccent);
      applyAccent(serverAccent);
    }
  }, []);

  return { accent, setAccent, loaded, initFromServer };
}

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();
  const { accent, setAccent } = useAccentColor();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    saveThemeToServer(newTheme, undefined);
  };

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-9 w-9">
        <PaletteIcon className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <PaletteIcon className="h-4 w-4" />
          <span className="sr-only">Theme settings</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 rounded-xl">
        {/* Mode Section */}
        <DropdownMenuLabel className="text-xs text-muted-foreground font-medium">
          Mode
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={() => handleThemeChange("light")} className="flex items-center gap-3">
          <SunIcon className="h-4 w-4" />
          <span className="text-sm">Light</span>
          {theme === "light" && <CheckIcon />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleThemeChange("dark")} className="flex items-center gap-3">
          <MoonIcon className="h-4 w-4" />
          <span className="text-sm">Dark</span>
          {theme === "dark" && <CheckIcon />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleThemeChange("system")} className="flex items-center gap-3">
          <MonitorIcon className="h-4 w-4" />
          <span className="text-sm">System</span>
          {theme === "system" && <CheckIcon />}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Accent Color Section */}
        <DropdownMenuLabel className="text-xs text-muted-foreground font-medium">
          Accent Color
        </DropdownMenuLabel>
        <div className="grid grid-cols-4 gap-1.5 px-2 py-2">
          {ACCENT_COLORS.map((c) => (
            <button
              key={c.value}
              onClick={() => setAccent(c.value)}
              className="group relative flex flex-col items-center gap-1"
              title={c.name}
            >
              <span
                className={`h-7 w-7 rounded-full ${c.color} transition-all ${
                  accent === c.value
                    ? "ring-2 ring-offset-2 ring-foreground scale-110"
                    : "hover:scale-110 opacity-80 hover:opacity-100"
                }`}
              />
              <span className="text-[10px] text-muted-foreground leading-none">
                {c.name}
              </span>
            </button>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CheckIcon() {
  return (
    <svg className="h-3.5 w-3.5 ml-auto text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}
