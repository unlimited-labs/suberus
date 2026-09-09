import type { Readable } from "node:stream";
import { ZipArchive } from "archiver";
import * as XLSX from "xlsx";
import {
	buildSubmissionWhereClause,
	type GetSubmissionsFilters,
} from "@/features/submissions/server/admin-submissions";
import { prisma } from "@/shared/server/db.server";
import { neutralizeFormula } from "@/shared/server/spreadsheet-safe";
import { getFileBuffer } from "@/shared/server/storage";

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
			Title: neutralizeFormula(s.title),
			"Main author": neutralizeFormula(mainName),
			"Co-authors": neutralizeFormula(coAuthors),
			Keywords: neutralizeFormula(
				s.keywords.map((k) => k.keyword.name).join(", "),
			),
			Track: neutralizeFormula(s.track?.name ?? ""),
			Acknowledgment: neutralizeFormula(s.acknowledgment ?? ""),
		};
	});

	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(
		wb,
		XLSX.utils.json_to_sheet(rows),
		"Submissions",
	);
	return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

export async function createSubmissionsZipStream(
	submissions: ExportSubmission[],
): Promise<Readable> {
	const archive = new ZipArchive({ store: true });

	const fileEntries = await Promise.all(
		submissions.map(async (s) => {
			const file = s.currentVersion?.file;
			if (file) {
				try {
					const buffer = await getFileBuffer(file.storageKey);
					const ext = getFileExtension(file.originalName);
					return { name: `${s.sequentialNumber}${ext}`, data: buffer };
				} catch {
					// Fall through to text content
				}
			}
			const content = s.currentVersion?.content || s.content;
			const body = s.acknowledgment
				? `${content}\n\nAcknowledgment\n${s.acknowledgment}`
				: content;
			return { name: `${s.sequentialNumber}.txt`, data: body };
		}),
	);

	for (const entry of fileEntries) {
		archive.append(entry.data, { name: entry.name });
	}

	archive.append(buildXlsx(submissions), { name: "submissions.xlsx" });

	void archive.finalize();

	return archive;
}
