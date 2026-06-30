import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { env } from "@/env";
import {
	deletePushSubscriptionFn,
	savePushSubscriptionFn,
} from "@/features/planner/api/push";

function urlBase64ToBuffer(base64: string): ArrayBuffer {
	const padding = "=".repeat((4 - (base64.length % 4)) % 4);
	const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
	const raw = atob(normalized);
	const buffer = new ArrayBuffer(raw.length);
	const view = new Uint8Array(buffer);
	for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
	return buffer;
}

export interface FavoriteNotificationsState {
	supported: boolean;
	enabled: boolean;
	busy: boolean;
	toggle: (next: boolean) => void;
}

export function useFavoriteNotifications(): FavoriteNotificationsState {
	const [supported, setSupported] = useState(false);
	const [enabled, setEnabled] = useState(false);
	const [busy, setBusy] = useState(false);

	useEffect(() => {
		const ok =
			"serviceWorker" in navigator &&
			"PushManager" in window &&
			"Notification" in window &&
			!!env.VITE_VAPID_PUBLIC_KEY;
		setSupported(ok);
		if (!ok) return;
		navigator.serviceWorker.ready
			.then((reg) => reg.pushManager.getSubscription())
			.then((sub) => setEnabled(!!sub))
			.catch(() => {});
	}, []);

	const enable = useCallback(async () => {
		const key = env.VITE_VAPID_PUBLIC_KEY;
		if (!key) return;
		setBusy(true);
		try {
			const permission = await Notification.requestPermission();
			if (permission !== "granted") {
				toast.error("Notifications permission denied");
				return;
			}
			const reg = await navigator.serviceWorker.ready;
			const sub = await reg.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: urlBase64ToBuffer(key),
			});
			const keys = sub.toJSON().keys;
			if (!keys?.p256dh || !keys.auth) {
				toast.error("Could not enable reminders");
				return;
			}
			await savePushSubscriptionFn({
				data: { endpoint: sub.endpoint, p256dh: keys.p256dh, auth: keys.auth },
			});
			setEnabled(true);
			toast.success("Reminders enabled");
		} catch {
			toast.error("Could not enable reminders");
		} finally {
			setBusy(false);
		}
	}, []);

	const disable = useCallback(async () => {
		setBusy(true);
		try {
			const reg = await navigator.serviceWorker.ready;
			const sub = await reg.pushManager.getSubscription();
			if (sub) {
				await deletePushSubscriptionFn({ data: { endpoint: sub.endpoint } });
				await sub.unsubscribe();
			}
			setEnabled(false);
			toast.success("Reminders disabled");
		} catch {
			toast.error("Could not disable reminders");
		} finally {
			setBusy(false);
		}
	}, []);

	const toggle = useCallback(
		(next: boolean) => {
			if (busy) return;
			void (next ? enable() : disable());
		},
		[busy, enable, disable],
	);

	return { supported, enabled, busy, toggle };
}
