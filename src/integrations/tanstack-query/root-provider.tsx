import { QueryClient } from "@tanstack/react-query";
import { setupOfflineProgram } from "./offline";

export function getContext() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 30 * 1000,
				retry: 1,
			},
		},
	});

	if ("window" in globalThis) setupOfflineProgram(queryClient);

	return {
		queryClient,
	};
}
