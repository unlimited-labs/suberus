import type { Fee } from "@/generated/prisma/client";
import { prisma } from "@/shared/server/db.server";

export async function getUserFee(
	userId: string,
): Promise<(Omit<Fee, "amount"> & { amount: number | null }) | null> {
	const fee = await prisma.fee.findUnique({
		where: { userId },
	});

	if (!fee?.paid) {
		return null;
	}

	// Convert Decimal to number for TanStack Start serialization
	return {
		...fee,
		amount: fee.amount ? Number(fee.amount) : null,
	};
}
