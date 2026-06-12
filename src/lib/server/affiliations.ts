import { prisma } from "@/db.server";

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
	const existing = await prisma.affiliation.findFirst({
		where: { name: { equals: name, mode: "insensitive" } },
		select: { id: true, name: true },
	});
	if (existing) return existing;

	return prisma.affiliation.create({
		data: { name },
		select: { id: true, name: true },
	});
}

export async function findAffiliationById(
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
