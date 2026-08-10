import { prisma } from "@/shared/server/db.server";

/** Call directly at every email-verification site: a startup-registered handler
 * silently no-ops here, because the bundler emits the registry into two chunks and
 * only the entry chunk runs registration. */
export async function linkCoAuthorsByEmail(
	email: string,
	userId: string,
): Promise<void> {
	await prisma.submissionAuthor.updateMany({
		where: { email: { equals: email, mode: "insensitive" }, userId: null },
		data: { userId },
	});
}
