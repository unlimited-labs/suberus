self.addEventListener("push", (event) => {
	if (!event.data) return;
	let payload;
	try {
		payload = event.data.json();
	} catch {
		payload = { title: "Reminder", body: event.data.text() };
	}
	event.waitUntil(
		self.registration.showNotification(payload.title || "Reminder", {
			body: payload.body || "",
			icon: "/web-app-manifest-192x192.png",
			badge: "/web-app-manifest-192x192.png",
			data: { url: payload.url || "/program" },
		}),
	);
});

self.addEventListener("notificationclick", (event) => {
	event.notification.close();
	const url = (event.notification.data && event.notification.data.url) || "/program";
	event.waitUntil(
		self.clients
			.matchAll({ type: "window", includeUncontrolled: true })
			.then((clients) => {
				for (const client of clients) {
					if (client.url.includes(url) && "focus" in client) {
						return client.focus();
					}
				}
				return self.clients.openWindow(url);
			}),
	);
});
