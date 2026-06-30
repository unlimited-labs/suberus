import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { auth } from "@/features/auth/server/auth.server";
import { authMiddleware } from "@/features/auth/server/middleware";
import {
	getFavoriteSlotIds,
	getPresentationDetail,
	type PresentationDetail,
	toggleFavorite,
} from "@/features/planner/server/favorites";

export type { PresentationDetailAuthor } from "@/features/planner/server/favorites";

const slotInput = z.object({ slotId: z.uuid() });

export const getMyFavoriteSlotsFn = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(({ context }) => getFavoriteSlotIds(context.user.id));

export const favoriteSlotsQueryOptions = () =>
	queryOptions({
		queryKey: ["program", "favorites"],
		queryFn: () => getMyFavoriteSlotsFn(),
	});

export const toggleFavoriteFn = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(slotInput)
	.handler(({ context, data }) => toggleFavorite(context.user.id, data.slotId));

export const getPresentationDetailFn = createServerFn({ method: "GET" })
	.validator(slotInput)
	.handler(async ({ data }): Promise<PresentationDetail | null> => {
		const session = await auth.api.getSession({ headers: getRequestHeaders() });
		const role = session?.user?.role;
		const canPreviewDraft = role === "ADMIN" || role === "EDITOR";
		return getPresentationDetail(data.slotId, canPreviewDraft);
	});

export const presentationDetailQueryOptions = (slotId: string) =>
	queryOptions({
		queryKey: ["program", "presentation", slotId],
		queryFn: () => getPresentationDetailFn({ data: { slotId } }),
	});
