import { StartClient } from "@tanstack/react-start/client";
import { StrictMode, startTransition } from "react";
import { hydrateRoot } from "react-dom/client";
import { installFetchVersionWatch } from "@/shared/lib/version-skew";

// Watch server-fn responses for a backend redeploy (version skew) so an open
// tab can prompt the user to refresh instead of silently calling a renamed fn.
installFetchVersionWatch();

// Dev-only, opt-in via VITE_REACT_SCAN="true": stream react-scan render/commit
// events to the local ingest route as JSONL. The import.meta.env.DEV guard is a
// Vite compile-time constant, so this block and react-scan/lite are dead-code-
// eliminated from the production bundle.
if (import.meta.env.DEV && import.meta.env.VITE_REACT_SCAN === "true") {
	import("react-scan/lite").then(({ instrument }) => {
		instrument({
			endpoint: `${location.origin}/api/react-scan-ingest`,
			sessionId: String(Date.now()),
			recordChangeDescriptions: true,
			includeFiberSource: true,
			includeFiberIdentity: true,
			minFiberActualDurationMs: 0.5,
		});
	});
}

if ("serviceWorker" in navigator) {
	navigator.serviceWorker.register("/sw.js").catch(() => {});
}

startTransition(() => {
	hydrateRoot(
		document,
		<StrictMode>
			<StartClient />
		</StrictMode>,
	);
});
