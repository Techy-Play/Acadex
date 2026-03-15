self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload = {
    title: "Acadex Notification",
    body: "You have a new update.",
    icon: "/images/android-chrome-192x192.png",
    data: { url: "/user/dashboard" },
  };

  try {
    payload = { ...payload, ...event.data.json() };
  } catch {
    // Ignore malformed payload and use fallback.
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon,
      badge: payload.icon,
      data: payload.data,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/user/dashboard";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        const clientUrl = new URL(client.url);
        const nextUrl = new URL(targetUrl, self.location.origin);
        if (clientUrl.origin === nextUrl.origin) {
          client.focus();
          client.navigate(nextUrl.toString());
          return;
        }
      }
      return clients.openWindow(targetUrl);
    })
  );
});
