import { queryOptions } from "@tanstack/react-query";
import { authClient } from "@/shared/lib/auth-client";

export const passkeysQueryKey = ["passkeys"] as const;

export const passkeysQueryOptions = () =>
	queryOptions({
		queryKey: passkeysQueryKey,
		queryFn: async () => {
			const res = await authClient.passkey.listUserPasskeys();
			if (res.error) {
				throw new Error(res.error.message ?? "Failed to load passkeys");
			}
			return res.data ?? [];
		},
	});
