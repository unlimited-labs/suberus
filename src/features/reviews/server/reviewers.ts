import { prisma } from "@/shared/server/db.server";

export interface ReviewerUser {
	id: string;
	name: string;
	email: string;
}

/**
 * Get users eligible as session supervisors (REVIEWER, EDITOR, ADMIN)
 */
export async function getReviewerUsers(): Promise<ReviewerUser[]> {
	const users = await prisma.user.findMany({
		where: {
			role: {
				in: ["REVIEWER", "EDITOR", "ADMIN"],
			},
			isActive: true,
		},
		select: {
			id: true,
			firstName: true,
			lastName: true,
			email: true,
		},
		orderBy: { firstName: "asc" },
	});

	return users.map((user) => ({
		id: user.id,
		name: `${user.firstName} ${user.lastName}`.trim(),
		email: user.email,
	}));
}
