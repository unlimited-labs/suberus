import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/features/auth/server/middleware";
import {
	getFavoriteSlotIds,
	getPresentationDetail,
	type PresentationDetail,
	toggleFavorite,
} from "@/features/planner/server/favorites";

export type { PresentationDetailAuthor } from "@/features/planner/server/favorites";

const slotInput = z.object({ slotId: z.string().uuid() });

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
	.middleware([authMiddleware])
	.validator(slotInput)
	.handler(({ context, data }): Promise<PresentationDetail | null> => {
		const role = context.user.role;
		const canPreviewDraft = role === "ADMIN" || role === "EDITOR";
		return getPresentationDetail(data.slotId, canPreviewDraft);
	});

export const presentationDetailQueryOptions = (slotId: string) =>
	queryOptions({
		queryKey: ["program", "presentation", slotId],
		queryFn: () => getPresentationDetailFn({ data: { slotId } }),
	});
