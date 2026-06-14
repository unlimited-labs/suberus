import { prisma } from "@/shared/server/db.server";

export async function checkEmailAvailable(email: string) {
	const user = await prisma.user.findUnique({
		where: { email },
		select: { id: true },
	});
	return { available: !user };
}
