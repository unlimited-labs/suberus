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

const CACHE = "suberus-program-v1";
const PROGRAM_DOC = "/program";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
			)
			.then(() => self.clients.claim()),
	);
});

// Offline-first for the public programme only. The SW is registered app-wide,
// so every other request (admin app, /_serverFn, API) falls through untouched.
// ponytail: no cache eviction — build assets from past deploys accumulate until
// the browser reclaims the origin's quota. Add an LRU trim if that ever bites.
self.addEventListener("fetch", (event) => {
	const { request } = event;
	if (request.method !== "GET") return;

	const url = new URL(request.url);
	if (url.origin !== self.location.origin) return;

	if (url.pathname.startsWith("/assets/")) {
		event.respondWith(cacheFirst(request));
		return;
	}

	if (
		request.mode === "navigate" &&
		url.pathname.replace(/\/$/, "") === PROGRAM_DOC
	) {
		event.respondWith(networkFirst(request));
	}
});

// Build assets are content-hashed, so a hit is never stale.
async function cacheFirst(request) {
	const cache = await caches.open(CACHE);
	const hit = await cache.match(request);
	if (hit) return hit;
	const response = await fetch(request);
	if (response.ok) await cache.put(request, response.clone());
	return response;
}

// Stored under a fixed key so /program and /program/ share one entry.
async function networkFirst(request) {
	const cache = await caches.open(CACHE);
	try {
		const response = await fetch(request);
		if (response.ok) await cache.put(PROGRAM_DOC, response.clone());
		return response;
	} catch (error) {
		const hit = await cache.match(PROGRAM_DOC);
		if (hit) return hit;
		throw error;
	}
}
