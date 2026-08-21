import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "@/features/auth/server/auth.server";
import { isParticipant } from "@/features/planner/server/favorites";
import {
	getPublicParticipants,
	type PublicParticipant,
} from "@/features/planner/server/participants";

export type { PublicParticipant };

export const getPublicParticipantsFn = createServerFn({
	method: "GET",
}).handler(async (): Promise<PublicParticipant[] | null> => {
	const session = await auth.api.getSession({ headers: getRequestHeaders() });
	const role = session?.user?.role;
	const canPreviewDraft = role === "ADMIN" || role === "EDITOR";
	const viewerIsParticipant = session?.user
		? canPreviewDraft || (await isParticipant(session.user.id))
		: false;
	return getPublicParticipants(canPreviewDraft, viewerIsParticipant);
});

// Deliberately outside the persisted "program" prefix: the roster carries consented
// e-mail addresses and must not sit in localStorage after the tab closes.
export const publicParticipantsQueryOptions = () =>
	queryOptions({
		queryKey: ["participants", "public"],
		queryFn: () => getPublicParticipantsFn(),
	});
