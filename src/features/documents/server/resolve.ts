import {
	computePlaceholders,
	type ResolvedPlaceholders,
} from "@/features/documents/lib/placeholders";
import { getSetting } from "@/features/settings/server/settings";
import { formatDate } from "@/shared/lib/format-date";
import { prisma } from "@/shared/server/db.server";

export type { ResolvedPlaceholders };

export function displayName(u: {
	firstName: string | null;
	lastName: string | null;
	email: string;
}): string {
	return [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email;
}

/**
 * Resolve every document placeholder for one participant. The caller blocks
 * generation when any *used* placeholder is in `missing`.
 */
export async function resolvePlaceholders(
	userId: string,
): Promise<ResolvedPlaceholders> {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: {
			firstName: true,
			lastName: true,
			email: true,
			affiliation: { select: { name: true } },
			submissions: {
				where: { status: "ACCEPTED" },
				select: { title: true },
				orderBy: { createdAt: "asc" },
			},
		},
	});

	if (!user) {
		throw new Response("User not found", { status: 404 });
	}

	const dateFormat = await getSetting("DATE_FORMAT");

	return computePlaceholders({
		firstName: user.firstName,
		lastName: user.lastName,
		email: user.email,
		affiliationName: user.affiliation?.name ?? null,
		acceptedTitles: user.submissions.map((s) => s.title),
		date: formatDate(new Date(), dateFormat),
	});
}
