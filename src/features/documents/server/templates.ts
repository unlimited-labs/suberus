import { TemplateHandler } from "easy-template-x";
import {
	isPlaceholderKey,
	PLACEHOLDER_KEYS,
} from "@/features/documents/lib/placeholders";
import { prisma } from "@/shared/server/db.server";
import {
	deleteFile,
	sanitizeFileName,
	uploadFile,
} from "@/shared/server/storage";

const DOCX_MIME =
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const MAX_TEMPLATE_BYTES = 10 * 1024 * 1024;

export function listTemplates() {
	return prisma.documentTemplate.findMany({ orderBy: { createdAt: "desc" } });
}

/**
 * Parse the template's `{tag}`s and validate them against the placeholder
 * registry. Only simple text replacements are supported (no loops/conditions),
 * so a non-`SelfClosed` tag or an unknown name is rejected. Returns the sorted
 * unique set of placeholder keys the template uses.
 */
export async function extractTemplatePlaceholders(
	buffer: Buffer,
): Promise<string[]> {
	let tags: Awaited<ReturnType<TemplateHandler["parseTags"]>>;
	try {
		tags = await new TemplateHandler().parseTags(buffer);
	} catch {
		throw new Error(
			"Could not read the .docx file. Is it a valid Word document?",
		);
	}

	const used = new Set<string>();
	const invalid = new Set<string>();
	for (const tag of tags) {
		if (tag.disposition !== "SelfClosed" || !isPlaceholderKey(tag.name)) {
			invalid.add(tag.rawText?.trim() || tag.name);
			continue;
		}
		used.add(tag.name);
	}

	if (invalid.size > 0) {
		throw new Error(
			`Unsupported placeholders: ${[...invalid].join(", ")}. ` +
				`Allowed: ${PLACEHOLDER_KEYS.map((k) => `{${k}}`).join(", ")}.`,
		);
	}
	return [...used].sort();
}

export async function createTemplate(opts: {
	file: File;
	buffer: Buffer;
	name: string;
	description: string | null;
	createdById: string;
}): Promise<{ id: string }> {
	if (opts.file.type && opts.file.type !== DOCX_MIME) {
		throw new Error("Only .docx templates are supported.");
	}
	if (opts.buffer.length === 0) {
		throw new Error("The uploaded file is empty.");
	}
	if (opts.buffer.length > MAX_TEMPLATE_BYTES) {
		throw new Error("Template exceeds the 10MB limit.");
	}
	const name = opts.name.trim();
	if (!name) throw new Error("A template name is required.");

	const placeholders = await extractTemplatePlaceholders(opts.buffer);

	const created = await prisma.documentTemplate.create({
		data: {
			name,
			description: opts.description?.trim() || null,
			storageKey: "",
			originalName: opts.file.name,
			size: opts.buffer.length,
			placeholders,
			createdById: opts.createdById,
		},
		select: { id: true },
	});

	const storageKey = `documents/templates/${created.id}/${sanitizeFileName(
		opts.file.name,
	)}`;
	await uploadFile(opts.buffer, storageKey, DOCX_MIME);
	await prisma.documentTemplate.update({
		where: { id: created.id },
		data: { storageKey },
	});

	return created;
}

export async function deleteTemplate(id: string): Promise<void> {
	const template = await prisma.documentTemplate.findUnique({ where: { id } });
	if (!template) return;
	if (template.storageKey) {
		await deleteFile(template.storageKey).catch(() => {});
	}
	// generated_documents.templateId → SetNull (history kept), batches → SetNull.
	await prisma.documentTemplate.delete({ where: { id } });
}
