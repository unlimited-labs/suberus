import { prisma } from "@/shared/server/db.server";

export async function checkEmailAvailable(email: string) {
	// better-auth lowercases at sign-up, so a raw-case lookup would report a
	// taken address as available.
	const user = await prisma.user.findUnique({
		where: { email: email.trim().toLowerCase() },
		select: { id: true },
	});
	return { available: !user };
}
