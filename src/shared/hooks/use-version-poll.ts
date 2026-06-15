import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import {
	reportVersion,
	type VersionResponse,
	versionResponseSchema,
} from "@/shared/lib/version-skew";

const DEFAULT_POLL_MS = 60 * 1000;

/**
 * Polls `/api/version` to proactively catch a backend redeploy. The poll
 * interval comes from the server response (`pollMs`, runtime-tunable), so it
 * defaults to 60s but can be lowered without a rebuild (E2E does this).
 * React Query pauses the interval while the tab is in the background
 * (`refetchIntervalInBackground` defaults to false), keeping it
 * battery-friendly on mobile. Shares the `["build-version"]` cache with the
 * admin build footer.
 */
export function useVersionPoll() {
	const { data } = useQuery({
		queryKey: ["build-version"],
		queryFn: async (): Promise<VersionResponse> => {
			const res = await fetch("/api/version");
			return versionResponseSchema.parse(await res.json());
		},
		staleTime: 30 * 1000,
		refetchInterval: (query) => query.state.data?.pollMs ?? DEFAULT_POLL_MS,
		refetchOnWindowFocus: true,
	});

	useEffect(() => {
		reportVersion(data?.commit);
	}, [data?.commit]);
}
