import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import {
	passkeysQueryKey,
	passkeysQueryOptions,
} from "@/features/profile/api/passkeys";
import { isStaleSessionError } from "@/features/profile/lib/is-stale-session-error";
import { authClient } from "@/shared/lib/auth-client";

const DISMISSED_KEY = "passkey-nudge-dismissed";

// Module scope, set synchronously: the component remounts while the session
// settles, and localStorage is only written after two awaits.
let offerStarted = false;

function markOffered() {
	try {
		window.localStorage.setItem(DISMISSED_KEY, "1");
	} catch {
		// localStorage unavailable (private mode) — the offer just returns later
	}
}

function wasOffered() {
	try {
		return window.localStorage.getItem(DISMISSED_KEY) !== null;
	} catch {
		return false;
	}
}

/**
 * Offers biometric sign-in once to logged-in users whose device has a platform
 * authenticator and who have no passkey yet. Rendered inside the app layout so
 * it covers every sign-in path (password, passkey, OAuth).
 */
export function PasskeyNudge() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	useEffect(() => {
		if (offerStarted || wasOffered()) return;
		if (!("PublicKeyCredential" in globalThis)) return;
		offerStarted = true;

		const enable = async () => {
			const res = await authClient.passkey.addPasskey();
			if (res?.error) {
				if (isStaleSessionError(res.error)) {
					toast.error("Confirm your password to add a passkey", {
						action: {
							label: "Open profile",
							onClick: () => void navigate({ to: "/profile" }),
						},
					});
					return;
				}
				toast.error(res.error.message ?? "Failed to add passkey");
				return;
			}
			toast.success("Passkey added");
			await queryClient.invalidateQueries({ queryKey: passkeysQueryKey });
		};

		void (async () => {
			const available =
				await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable?.().catch(
					() => false,
				);
			if (!available) return;
			const passkeys = await queryClient
				.fetchQuery(passkeysQueryOptions())
				.catch(() => null);
			if (!passkeys || passkeys.length > 0) return;

			// Persist before showing: the offer is made once per browser, whether or
			// not the toast is answered.
			markOffered();
			toast("Sign in faster next time", {
				action: { label: "Enable", onClick: () => void enable() },
				cancel: { label: "Not now", onClick: () => {} },
				description:
					"Use your fingerprint, Face ID or device PIN instead of a password.",
				duration: 15_000,
			});
		})();
	}, [navigate, queryClient]);

	return null;
}
