import { onlineManager } from "@tanstack/react-query";
import { useEffect, useState, useSyncExternalStore } from "react";

interface BeforeInstallPromptEvent extends Event {
	prompt: () => Promise<void>;
}

export function useIsOffline() {
	return useSyncExternalStore(
		(onChange) => onlineManager.subscribe(onChange),
		() => !onlineManager.isOnline(),
		() => false,
	);
}

/**
 * Chromium's install prompt. Safari/iOS never fires the event, so `canInstall`
 * stays false there and the caller simply renders nothing.
 */
export function useInstallPrompt() {
	const [promptEvent, setPromptEvent] =
		useState<BeforeInstallPromptEvent | null>(null);

	useEffect(() => {
		const onBeforeInstall = (event: Event) => {
			event.preventDefault();
			// SAFETY: the beforeinstallprompt listener only fires with that event.
			setPromptEvent(event as BeforeInstallPromptEvent);
		};
		const onInstalled = () => setPromptEvent(null);
		window.addEventListener("beforeinstallprompt", onBeforeInstall);
		window.addEventListener("appinstalled", onInstalled);
		return () => {
			window.removeEventListener("beforeinstallprompt", onBeforeInstall);
			window.removeEventListener("appinstalled", onInstalled);
		};
	}, []);

	const install = async () => {
		if (!promptEvent) return;
		await promptEvent.prompt();
		setPromptEvent(null);
	};

	return { canInstall: !!promptEvent, install };
}
