import { TemplateHandler } from "easy-template-x";
import { env } from "@/env";
import { activityDetail } from "@/features/activity-log/types";
import { renderDocxToPdf } from "@/features/documents/server/docx-pdf-client";
import { resolvePlaceholders } from "@/features/documents/server/resolve";
import { loadSigningMaterial } from "@/features/settings/server/document-signing";
import { getSetting } from "@/features/settings/server/settings";
import { logger } from "@/logger";
import { prisma } from "@/shared/server/db.server";
import { sendEmail } from "@/shared/server/email";
import { sanitizeFileName } from "@/shared/server/file-names";
import { signPdf } from "@/shared/server/pdf-signing-client";
import { ensureQueueAndSend } from "@/shared/server/queue";
import { getFileBuffer, uploadFile } from "@/shared/server/storage";

export const DOCUMENT_GENERATE_QUEUE = "document-generate";

export const ENQUEUE_OPTS = {
	retryLimit: 2,
	retryDelay: 30,
	expireInSeconds: 600,
};

async function unresolvableFor(
	userId: string,
	placeholders: string[],
): Promise<string[]> {
	const { missing } = await resolvePlaceholders(userId);
	const missingSet = new Set<string>(missing);
	return placeholders.filter((p) => missingSet.has(p));
}

export async function createGeneratedDocument(opts: {
	userId: string;
	templateId: string;
	generatedById: string;
	name?: string;
}): Promise<{ id: string }> {
	const template = await prisma.documentTemplate.findUnique({
		where: { id: opts.templateId },
	});
	if (!template) throw new Error("Template not found.");

	const blocked = await unresolvableFor(opts.userId, template.placeholders);
	if (blocked.length > 0) {
		throw new Error(`Cannot generate: missing data for ${blocked.join(", ")}.`);
	}

	const doc = await prisma.generatedDocument.create({
		data: {
			userId: opts.userId,
			templateId: template.id,
			name: opts.name?.trim() || template.name,
			generatedById: opts.generatedById,
			status: "PENDING",
		},
		select: { id: true },
	});

	await prisma.activityLog.create({
		data: {
			type: "DOCUMENT_GENERATED",
			userId: opts.userId,
			performedBy: opts.generatedById,
			detail: activityDetail("DOCUMENT_GENERATED", {
				documentName: opts.name?.trim() || template.name,
				templateName: template.name,
			}),
		},
	});

	await ensureQueueAndSend(
		DOCUMENT_GENERATE_QUEUE,
		{ documentId: doc.id },
		ENQUEUE_OPTS,
	);
	return doc;
}

export interface ResolutionPreview {
	placeholders: string[];
	values: Record<string, string>;
	missing: string[];
}

export async function previewResolution(
	userId: string,
	templateId: string,
): Promise<ResolutionPreview> {
	const template = await prisma.documentTemplate.findUnique({
		where: { id: templateId },
		select: { placeholders: true },
	});
	if (!template) throw new Error("Template not found.");

	const { values, missing } = await resolvePlaceholders(userId);
	const missingSet = new Set<string>(missing);
	return {
		placeholders: template.placeholders,
		values: Object.fromEntries(
			template.placeholders.map((p) => [
				p,
				// SAFETY: placeholder values are built as a string map by the caller.
				(values as Record<string, string>)[p] ?? "",
			]),
		),
		missing: template.placeholders.filter((p) => missingSet.has(p)),
	};
}

export async function processDocumentGeneration(
	documentId: string,
): Promise<void> {
	const doc = await prisma.generatedDocument.findUnique({
		where: { id: documentId },
		include: {
			template: true,
			user: { select: { email: true, firstName: true } },
		},
	});
	if (!doc) {
		logger.info(
			`[document-generate] ${documentId} gone before render — skipped`,
		);
		return;
	}
	if (!doc.template) throw new Error("Template was deleted before generation");

	const [{ values }, blocked] = await Promise.all([
		resolvePlaceholders(doc.userId),
		unresolvableFor(doc.userId, doc.template.placeholders),
	]);
	if (blocked.length > 0) {
		throw new Error(`Missing data for ${blocked.join(", ")}`);
	}

	const [templateBuffer, signing] = await Promise.all([
		getFileBuffer(doc.template.storageKey),
		loadSigningMaterial(),
	]);
	const filledDocx = await new TemplateHandler().process(
		templateBuffer,
		values,
	);
	let pdf = await renderDocxToPdf(
		filledDocx,
		`${sanitizeFileName(doc.name) || "document"}.docx`,
	);

	let signed = false;
	if (signing) {
		const { cfg } = signing;
		pdf = await signPdf(pdf, {
			p12: signing.p12,
			password: signing.password,
			reason:
				cfg.sealReason || `Issued by ${await getSetting("CONFERENCE_NAME")}`,
			location: await getSetting("CONFERENCE_NAME"),
			corner: cfg.sealCorner,
			qrUrl: cfg.sealQrEnabled
				? `${new URL(env.APP_BASE_URL).origin}/verify-document`
				: undefined,
			timestampUrl: cfg.timestampEnabled ? cfg.timestampUrl : undefined,
			certify: cfg.certifying,
		});
		signed = true;
	}

	const storageKey = `documents/generated/${doc.userId}/${doc.id}.pdf`;
	await uploadFile(pdf, storageKey, "application/pdf");

	await prisma.generatedDocument.update({
		where: { id: doc.id },
		data: {
			status: "READY",
			storageKey,
			size: pdf.length,
			signed,
			error: null,
		},
	});
	logger.info(`[document-generate] ${doc.id} ready (${pdf.length} bytes)`);

	const documentsUrl = `${new URL(env.APP_BASE_URL).origin}/documents`;
	await sendEmail("DOCUMENT_GENERATED", doc.user.email, {
		firstName: doc.user.firstName ?? "",
		documentName: doc.name,
		documentsUrl,
		conferenceName: await getSetting("CONFERENCE_NAME"),
	});
}
