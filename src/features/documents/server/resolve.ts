import {
	computePlaceholders,
	type ResolvedPlaceholders,
} from "@/features/documents/lib/placeholders";
import { getSetting } from "@/features/settings/server/settings";
import type { Prisma } from "@/generated/prisma/client";
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

const placeholderUserSelect = {
	id: true,
	firstName: true,
	lastName: true,
	email: true,
	affiliation: { select: { name: true } },
	submissions: {
		where: { status: "ACCEPTED" },
		select: { title: true },
		orderBy: { createdAt: "asc" },
	},
} satisfies Prisma.UserSelect;

type PlaceholderUser = Prisma.UserGetPayload<{
	select: typeof placeholderUserSelect;
}>;

function placeholdersFor(
	user: PlaceholderUser,
	dateFormat: string,
): ResolvedPlaceholders {
	return computePlaceholders({
		firstName: user.firstName,
		lastName: user.lastName,
		email: user.email,
		affiliationName: user.affiliation?.name ?? null,
		acceptedTitles: user.submissions.map((s) => s.title),
		date: formatDate(new Date(), dateFormat),
	});
}

export async function resolvePlaceholders(
	userId: string,
): Promise<ResolvedPlaceholders> {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: placeholderUserSelect,
	});

	if (!user) {
		throw new Response("User not found", { status: 404 });
	}

	return placeholdersFor(user, await getSetting("DATE_FORMAT"));
}

export async function resolvePlaceholdersForUsers(
	userIds: string[],
): Promise<Array<{ user: PlaceholderUser; resolved: ResolvedPlaceholders }>> {
	const [users, dateFormat] = await Promise.all([
		prisma.user.findMany({
			where: { id: { in: userIds } },
			select: placeholderUserSelect,
		}),
		getSetting("DATE_FORMAT"),
	]);
	return users.map((user) => ({
		user,
		resolved: placeholdersFor(user, dateFormat),
	}));
}
