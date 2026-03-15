"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { subscribeBrowserPush } from "@/lib/push/client";

const PROMPTED_KEY = "acadex-push-prompted";

export function PushInit() {
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      return;
    }

    async function initPush() {
      try {
        let permission = Notification.permission;

        if (permission === "default" && !localStorage.getItem(PROMPTED_KEY)) {
          localStorage.setItem(PROMPTED_KEY, "1");
          permission = await Notification.requestPermission();
        }

        if (permission !== "granted") return;

        const subscribed = await subscribeBrowserPush();
        if (subscribed && !sessionStorage.getItem("acadex-push-connected")) {
          sessionStorage.setItem("acadex-push-connected", "1");
          toast.success("Device notifications enabled");
        }
      } catch {
        // Non-blocking: app should continue even if push setup fails.
      }
    }

    void initPush();
  }, []);

  return null;
}
