import type { DocumentStatus } from "@/generated/prisma/enums";
import { prisma } from "@/shared/server/db.server";
import { deleteFile } from "@/shared/server/storage";

function displayName(u: {
	firstName: string | null;
	lastName: string | null;
	email: string;
}): string {
	return [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email;
}

export interface DocumentRow {
	id: string;
	name: string;
	status: DocumentStatus;
	error: string | null;
	createdAt: Date;
	size: number | null;
	hasFile: boolean;
	participant: { id: string; name: string; email: string };
	templateName: string | null;
}

const ADMIN_LIST_CAP = 200; // ponytail: manual-scale list; add paging if it grows

const rowSelect = {
	id: true,
	name: true,
	status: true,
	error: true,
	createdAt: true,
	size: true,
	storageKey: true,
	user: { select: { id: true, firstName: true, lastName: true, email: true } },
	template: { select: { name: true } },
} as const;

function toRow(d: {
	id: string;
	name: string;
	status: DocumentStatus;
	error: string | null;
	createdAt: Date;
	size: number | null;
	storageKey: string | null;
	user: {
		id: string;
		firstName: string | null;
		lastName: string | null;
		email: string;
	};
	template: { name: string } | null;
}): DocumentRow {
	return {
		id: d.id,
		name: d.name,
		status: d.status,
		error: d.error,
		createdAt: d.createdAt,
		size: d.size,
		hasFile: Boolean(d.storageKey),
		participant: {
			id: d.user.id,
			name: displayName(d.user),
			email: d.user.email,
		},
		templateName: d.template?.name ?? null,
	};
}

/** Central admin view: every generated document across all participants. */
export async function adminListDocuments(filters?: {
	search?: string;
	status?: DocumentStatus;
	templateId?: string;
}): Promise<DocumentRow[]> {
	const search = filters?.search?.trim();
	const rows = await prisma.generatedDocument.findMany({
		where: {
			status: filters?.status,
			templateId: filters?.templateId,
			...(search
				? {
						user: {
							OR: [
								{ firstName: { contains: search, mode: "insensitive" } },
								{ lastName: { contains: search, mode: "insensitive" } },
								{ email: { contains: search, mode: "insensitive" } },
							],
						},
					}
				: {}),
		},
		select: rowSelect,
		orderBy: { createdAt: "desc" },
		take: ADMIN_LIST_CAP,
	});
	return rows.map(toRow);
}

/** Documents generated for one participant (user-detail panel). */
export async function adminListUserDocuments(
	userId: string,
): Promise<DocumentRow[]> {
	const rows = await prisma.generatedDocument.findMany({
		where: { userId },
		select: rowSelect,
		orderBy: { createdAt: "desc" },
	});
	return rows.map(toRow);
}

export interface MyDocument {
	id: string;
	name: string;
	createdAt: Date;
	size: number | null;
}

/** Participant-facing: only READY documents are downloadable/visible. */
export async function listMyDocuments(userId: string): Promise<MyDocument[]> {
	return prisma.generatedDocument.findMany({
		where: { userId, status: "READY" },
		select: { id: true, name: true, createdAt: true, size: true },
		orderBy: { createdAt: "desc" },
	});
}

export function countMyReadyDocuments(userId: string): Promise<number> {
	return prisma.generatedDocument.count({
		where: { userId, status: "READY" },
	});
}

/** Admin/Editor: delete a generated document (row + stored PDF). Silent. */
export async function deleteDocument(id: string): Promise<void> {
	const doc = await prisma.generatedDocument.findUnique({
		where: { id },
		select: { storageKey: true },
	});
	if (!doc) return;
	if (doc.storageKey) {
		await deleteFile(doc.storageKey).catch(() => {});
	}
	await prisma.generatedDocument.delete({ where: { id } });
}
