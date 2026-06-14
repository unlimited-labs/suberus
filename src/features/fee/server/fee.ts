import { prisma } from "@/db.server";
import type { Fee } from "@/generated/prisma/client";

/**
 * Get fee for a specific user
 * @param userId - User ID to fetch fee for
 * @returns Fee record or null if not found, with amount converted to number for serialization
 */
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
