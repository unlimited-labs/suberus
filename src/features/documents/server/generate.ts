import { TemplateHandler } from "easy-template-x";
import { env } from "@/env";
import { activityDetail } from "@/features/activity-log/types";
import { renderDocxToPdf } from "@/features/documents/server/docx-pdf-client";
import { resolvePlaceholders } from "@/features/documents/server/resolve";
import { getSealLogoBytes } from "@/features/settings/server/branding";
import { loadSigningMaterial } from "@/features/settings/server/document-signing";
import { getSetting } from "@/features/settings/server/settings";
import { logger } from "@/logger";
import { prisma } from "@/shared/server/db.server";
import { sendEmail } from "@/shared/server/email";
import { signPdf } from "@/shared/server/pdf-signing-client";
import { ensureQueueAndSend } from "@/shared/server/queue";
import {
	getFileBuffer,
	sanitizeFileName,
	uploadFile,
} from "@/shared/server/storage";

export const DOCUMENT_GENERATE_QUEUE = "document-generate";

const ENQUEUE_OPTS = { retryLimit: 2, retryDelay: 30, expireInSeconds: 600 };

/** Template placeholders that the participant can't fill — block list. */
async function unresolvableFor(
	userId: string,
	placeholders: string[],
): Promise<string[]> {
	const { missing } = await resolvePlaceholders(userId);
	const missingSet = new Set<string>(missing);
	return placeholders.filter((p) => missingSet.has(p));
}

/**
 * Request side: validate (block on any missing data), create a PENDING row and
 * enqueue the render job. Synchronous validation gives the operator immediate
 * feedback; the heavy render happens in the worker.
 */
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
	/** Placeholders the template uses (registry keys). */
	placeholders: string[];
	/** Value for each used placeholder (empty string when unresolved). */
	values: Record<string, string>;
	/** Used placeholders with no value — generation is blocked while non-empty. */
	missing: string[];
}

/** Preview, for one participant + template, which placeholders resolve. */
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
				(values as Record<string, string>)[p] ?? "",
			]),
		),
		missing: template.placeholders.filter((p) => missingSet.has(p)),
	};
}

/**
 * Worker side: render the PDF for one PENDING row and mark it READY, then email
 * the participant. Throws on failure so the worker can record FAILED and pg-boss
 * can retry transient errors (sidecar blip).
 */
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
	if (!doc) throw new Error(`GeneratedDocument ${documentId} not found`);
	if (!doc.template) throw new Error("Template was deleted before generation");

	const { values } = await resolvePlaceholders(doc.userId);
	const blocked = await unresolvableFor(doc.userId, doc.template.placeholders);
	if (blocked.length > 0) {
		throw new Error(`Missing data for ${blocked.join(", ")}`);
	}

	const templateBuffer = await getFileBuffer(doc.template.storageKey);
	const filledDocx = await new TemplateHandler().process(
		templateBuffer,
		values,
	);
	let pdf = await renderDocxToPdf(
		filledDocx,
		`${sanitizeFileName(doc.name) || "document"}.docx`,
	);

	// Sign when enabled. A signing failure fails the job (retry/FAILED) — we never
	// silently deliver an unsigned doc when signing is on.
	// ponytail: per-render S3 fetch of the small P12; cache if it shows in profiles.
	const signing = await loadSigningMaterial();
	let signed = false;
	if (signing) {
		const { cfg } = signing;
		const logo = cfg.sealLogoEnabled ? await getSealLogoBytes() : undefined;
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
			logo,
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
