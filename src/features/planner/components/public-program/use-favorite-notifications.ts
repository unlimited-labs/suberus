import { useEffect, useState, useSyncExternalStore } from "react";
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

const emptySubscribe = () => () => {};

const getSupportedSnapshot = () =>
	"serviceWorker" in navigator &&
	"PushManager" in window &&
	"Notification" in window &&
	!!env.VITE_VAPID_PUBLIC_KEY;

const getServerSupportedSnapshot = () => false;

export function useFavoriteNotifications(): FavoriteNotificationsState {
	const supported = useSyncExternalStore(
		emptySubscribe,
		getSupportedSnapshot,
		getServerSupportedSnapshot,
	);
	const [enabled, setEnabled] = useState(false);
	const [busy, setBusy] = useState(false);

	useEffect(() => {
		if (!supported) return;
		navigator.serviceWorker.ready
			.then((reg) => reg.pushManager.getSubscription())
			.then((sub) => setEnabled(!!sub))
			.catch(() => {});
	}, [supported]);

	const enable = async () => {
		const key = env.VITE_VAPID_PUBLIC_KEY;
		if (!key) return;
		setEnabled(true);
		setBusy(true);
		try {
			const permission = await Notification.requestPermission();
			if (permission !== "granted") {
				setEnabled(false);
				toast.error("Notifications permission denied", {
					position: "bottom-center",
				});
				setBusy(false);
				return;
			}
			const reg = await navigator.serviceWorker.ready;
			const sub = await reg.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: urlBase64ToBuffer(key),
			});
			const keys = sub.toJSON().keys;
			if (!keys?.p256dh || !keys.auth) {
				setEnabled(false);
				toast.error("Could not enable reminders", {
					position: "bottom-center",
				});
				setBusy(false);
				return;
			}
			await savePushSubscriptionFn({
				data: { endpoint: sub.endpoint, p256dh: keys.p256dh, auth: keys.auth },
			});
		} catch {
			setEnabled(false);
			toast.error("Could not enable reminders", { position: "bottom-center" });
		}
		setBusy(false);
	};

	const disable = async () => {
		setEnabled(false);
		setBusy(true);
		try {
			const reg = await navigator.serviceWorker.ready;
			const sub = await reg.pushManager.getSubscription();
			if (sub) {
				await deletePushSubscriptionFn({ data: { endpoint: sub.endpoint } });
				await sub.unsubscribe();
			}
		} catch {
			setEnabled(true);
			toast.error("Could not disable reminders", { position: "bottom-center" });
		}
		setBusy(false);
	};

	const toggle = (next: boolean) => {
		if (busy) return;
		void (next ? enable() : disable());
	};

	return { supported, enabled, busy, toggle };
}
