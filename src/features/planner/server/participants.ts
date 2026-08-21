import { getSetting } from "@/features/settings/server/settings";
import { prisma } from "@/shared/server/db.server";
import { isScheduleVisible } from "./schedule";

export interface PublicParticipant {
	id: string;
	firstName: string;
	lastName: string;
	affiliationName: string | null;
	orcid: string | null;
	email: string | null;
}

// ponytail: whole list in one payload, filtered client-side; paginate past a few thousand attendees.
export async function getPublicParticipants(
	viewerCanPreviewDraft = false,
	viewerIsParticipant = false,
): Promise<PublicParticipant[] | null> {
	if (!viewerIsParticipant) return null;
	if (!(await isScheduleVisible(viewerCanPreviewDraft))) return null;
	if (!(await getSetting("PROGRAM_SHOW_AUTHOR_INFO"))) return null;

	const users = await prisma.user.findMany({
		where: { isActive: true, fee: { paid: true } },
		select: {
			id: true,
			firstName: true,
			lastName: true,
			orcid: true,
			email: true,
			contactConsent: true,
			affiliation: { select: { name: true } },
		},
		orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
	});

	return users.map((u) => ({
		id: u.id,
		firstName: u.firstName ?? "",
		lastName: u.lastName ?? "",
		affiliationName: u.affiliation?.name ?? null,
		orcid: u.contactConsent ? u.orcid : null,
		email: u.contactConsent ? u.email : null,
	}));
}
