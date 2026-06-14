import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/features/auth/server/middleware";
import { getActiveTracks } from "@/features/tracks/server/tracks";

export const activeTracksQueryOptions = () =>
	queryOptions({
		queryKey: ["tracks", "active"],
		queryFn: () => getActiveTracksFn(),
	});

/**
 * Get active tracks (authenticated users)
 */
export const getActiveTracksFn = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(async () => {
		return getActiveTracks();
	});
