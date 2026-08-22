import { activityDetail } from "@/features/activity-log/types";
import { displayName } from "@/features/documents/server/resolve";
import type { DocumentStatus } from "@/generated/prisma/enums";
import { prisma } from "@/shared/server/db.server";
import { deleteFile } from "@/shared/server/storage";

export interface DocumentRow {
	id: string;
	name: string;
	status: DocumentStatus;
	error: string | null;
	createdAt: Date;
	size: number | null;
	signed: boolean;
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
	signed: true,
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
	signed: boolean;
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
		signed: d.signed,
		hasFile: Boolean(d.storageKey),
		participant: {
			id: d.user.id,
			name: displayName(d.user),
			email: d.user.email,
		},
		templateName: d.template?.name ?? null,
	};
}

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
			user: !search
				? undefined
				: {
						OR: [
							{ firstName: { contains: search, mode: "insensitive" } },
							{ lastName: { contains: search, mode: "insensitive" } },
							{ email: { contains: search, mode: "insensitive" } },
						],
					},
		},
		select: rowSelect,
		orderBy: { createdAt: "desc" },
		take: ADMIN_LIST_CAP,
	});
	return rows.map(toRow);
}

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
	signed: boolean;
}

export async function listMyDocuments(userId: string): Promise<MyDocument[]> {
	return prisma.generatedDocument.findMany({
		where: { userId, status: "READY" },
		select: { id: true, name: true, createdAt: true, size: true, signed: true },
		orderBy: { createdAt: "desc" },
	});
}

export function countMyReadyDocuments(userId: string): Promise<number> {
	return prisma.generatedDocument.count({
		where: { userId, status: "READY" },
	});
}

export async function deleteDocument(
	id: string,
	performedById?: string,
): Promise<void> {
	const doc = await prisma.generatedDocument.findUnique({
		where: { id },
		select: { storageKey: true, userId: true, name: true },
	});
	if (!doc) return;
	if (doc.storageKey) {
		await deleteFile(doc.storageKey).catch(() => {});
	}
	await prisma.generatedDocument.delete({ where: { id } });

	await prisma.activityLog.create({
		data: {
			type: "DOCUMENT_DELETED",
			userId: doc.userId,
			performedBy: performedById,
			detail: activityDetail("DOCUMENT_DELETED", { documentName: doc.name }),
		},
	});
}
