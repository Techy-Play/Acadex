/**
 * @component RouteProgress
 * @description Thin animated progress bar displayed at the top of the
 * viewport during client-side route transitions. Listens to
 * pathname / searchParams changes via Next.js hooks.
 */
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const prevPath = useRef(pathname);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startProgress = useCallback(() => {
    setVisible(true);
    setProgress(0);

    // Clear any existing interval
    if (timerRef.current) clearInterval(timerRef.current);

    let p = 0;
    timerRef.current = setInterval(() => {
      p += Math.random() * 15 + 5;
      if (p > 90) p = 90;
      setProgress(p);
    }, 200);
  }, []);

  const completeProgress = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    requestAnimationFrame(() => {
      setProgress(100);
      setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 300);
    });
  }, []);

  useEffect(() => {
    const currentPath = pathname + searchParams.toString();
    const prevPathStr = prevPath.current;

    if (currentPath !== prevPathStr) {
      completeProgress();
      // Auto-scroll to top on route change
      window.scrollTo({ top: 0, behavior: "instant" });
    }

    prevPath.current = currentPath;
  }, [pathname, searchParams, completeProgress]);

  // Intercept link clicks to start progress
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      // Skip external links, hash links, and same-page links
      if (
        href.startsWith("http") ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        anchor.target === "_blank"
      ) {
        return;
      }

      // Only trigger for actual navigation (different path)
      if (href !== pathname) {
        startProgress();
      }
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [pathname, startProgress]);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-[3px]">
      <div
        className="h-full bg-primary rounded-r-full shadow-[0_0_10px_rgba(var(--primary),0.5)]"
        style={{
          width: `${progress}%`,
          transition: progress === 0 ? "none" : "width 0.3s ease-out",
        }}
      />
    </div>
  );
}
