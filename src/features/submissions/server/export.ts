import { once } from "node:events";
import type { Readable } from "node:stream";
import { ZipArchive } from "archiver";
import {
	buildSubmissionWhereClause,
	type GetSubmissionsFilters,
} from "@/features/submissions/server/admin-submissions";
import { logger } from "@/logger";
import { prisma } from "@/shared/server/db.server";
import { getFileBuffer } from "@/shared/server/storage";
import { writeXlsxBuffer } from "@/shared/server/xlsx-write";

export async function getSubmissionsForExport(filters: GetSubmissionsFilters) {
	const where = buildSubmissionWhereClause(filters);

	return prisma.submission.findMany({
		where,
		select: {
			sequentialNumber: true,
			title: true,
			content: true,
			acknowledgment: true,
			type: true,
			authors: {
				select: {
					firstName: true,
					lastName: true,
					isPresenter: true,
					orderIndex: true,
				},
				orderBy: { orderIndex: "asc" },
			},
			keywords: {
				select: { keyword: { select: { name: true } } },
			},
			track: { select: { name: true } },
			currentVersion: {
				select: {
					content: true,
					file: {
						select: { storageKey: true, originalName: true },
					},
				},
			},
		},
		orderBy: { sequentialNumber: "asc" },
	});
}

type ExportSubmission = Awaited<
	ReturnType<typeof getSubmissionsForExport>
>[number];

function getFileExtension(originalName: string): string {
	const lastDot = originalName.lastIndexOf(".");
	return lastDot >= 0 ? originalName.slice(lastDot) : "";
}

function getMainAuthor(
	authors: ExportSubmission["authors"],
): ExportSubmission["authors"][number] | undefined {
	return (
		authors.find((a) => a.isPresenter) ??
		authors.sort((a, b) => a.orderIndex - b.orderIndex)[0]
	);
}

function getCoAuthors(
	authors: ExportSubmission["authors"],
): ExportSubmission["authors"] {
	const mainAuthor = getMainAuthor(authors);
	if (!mainAuthor) return [];
	return authors.filter(
		(a) =>
			!(
				a.firstName === mainAuthor.firstName &&
				a.lastName === mainAuthor.lastName &&
				a.isPresenter === mainAuthor.isPresenter
			),
	);
}

function buildXlsx(submissions: ExportSubmission[]): Buffer {
	const rows = submissions.map((s) => {
		const main = getMainAuthor(s.authors);
		const mainName = main ? `${main.firstName} ${main.lastName}` : "";
		const coAuthors = getCoAuthors(s.authors)
			.map((a) => `${a.firstName} ${a.lastName}`)
			.join(", ");

		return {
			Number: s.sequentialNumber,
			Title: s.title,
			"Main author": mainName,
			"Co-authors": coAuthors,
			Keywords: s.keywords.map((k) => k.keyword.name).join(", "),
			Track: s.track?.name ?? "",
			Acknowledgment: s.acknowledgment ?? "",
		};
	});

	return writeXlsxBuffer(rows, "Submissions");
}

async function buildZipEntry(
	s: ExportSubmission,
	missing: string[],
): Promise<{ name: string; data: Buffer | string }> {
	const file = s.currentVersion?.file;
	if (file) {
		try {
			const buffer = await getFileBuffer(file.storageKey);
			const ext = getFileExtension(file.originalName);
			return { name: `${s.sequentialNumber}${ext}`, data: buffer };
		} catch (error) {
			logger.error(
				`[export] S3 fetch failed for ${file.storageKey}, using text`,
				error,
			);
			missing.push(`${s.sequentialNumber} — ${file.originalName}`);
		}
	}
	const content = s.currentVersion?.content || s.content;
	const body = s.acknowledgment
		? `${content}\n\nAcknowledgment\n${s.acknowledgment}`
		: content;
	return { name: `${s.sequentialNumber}.txt`, data: body };
}

async function appendEntry(
	archive: ZipArchive,
	data: Buffer | string,
	name: string,
): Promise<void> {
	const appended = once(archive, "entry");
	archive.append(data, { name });
	await appended;
}

export function createSubmissionsZipStream(
	submissions: ExportSubmission[],
): Readable {
	const archive = new ZipArchive({ store: true });

	// Sequential so only one file is held in memory at a time.
	void (async () => {
		const missing: string[] = [];
		for (const s of submissions) {
			const entry = await buildZipEntry(s, missing);
			await appendEntry(archive, entry.data, entry.name);
		}
		await appendEntry(archive, buildXlsx(submissions), "submissions.xlsx");
		if (missing.length > 0) {
			await appendEntry(
				archive,
				`Original files could not be fetched; text content included instead:\n${missing.join("\n")}\n`,
				"_MISSING_FILES.txt",
			);
		}
		await archive.finalize();
	})().catch((err) => {
		logger.error("[export] ZIP build failed", err);
		archive.destroy(err);
	});

	return archive;
}
