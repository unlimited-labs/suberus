import { prisma } from "@/db";

export interface AffiliationResult {
	id: string;
	name: string;
}

export async function findAffiliations(
	query: string,
): Promise<AffiliationResult[]> {
	const q = query.trim();

	return prisma.affiliation.findMany({
		where: q
			? {
					name: {
						contains: q,
						mode: "insensitive",
					},
				}
			: undefined,
		orderBy: { name: "asc" },
		take: 20,
		select: {
			id: true,
			name: true,
		},
	});
}

export async function upsertAffiliation(
	name: string,
): Promise<AffiliationResult> {
	return prisma.affiliation.upsert({
		where: { name },
		update: {},
		create: { name },
		select: {
			id: true,
			name: true,
		},
	});
}

export async function getAffiliationById(
	id: string,
): Promise<AffiliationResult | null> {
	return prisma.affiliation.findUnique({
		where: { id },
		select: {
			id: true,
			name: true,
		},
	});
}
