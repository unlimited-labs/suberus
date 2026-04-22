import { Buffer } from "node:buffer";
import { Readable } from "node:stream";
import archiver from "archiver";
import { prisma } from "@/db.server";
import {
	buildSubmissionWhereClause,
	type GetSubmissionsFilters,
} from "@/lib/server/admin/submissions";
import { getFileContent } from "@/lib/server/storage";

export async function getSubmissionsForExport(filters: GetSubmissionsFilters) {
	const where = buildSubmissionWhereClause(filters);

	return prisma.submission.findMany({
		where,
		select: {
			sequentialNumber: true,
			title: true,
			content: true,
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

function escapeCsvField(value: string): string {
	if (value.includes('"') || value.includes(",") || value.includes("\n")) {
		return `"${value.replace(/"/g, '""')}"`;
	}
	return value;
}

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

function buildCsv(submissions: ExportSubmission[]): string {
	const header = "sequentialNumber,title,mainAuthor,coAuthors,keywords,track";
	const rows = submissions.map((s) => {
		const main = getMainAuthor(s.authors);
		const mainName = main ? `${main.firstName} ${main.lastName}` : "";
		const coAuthors = getCoAuthors(s.authors)
			.map((a) => `${a.firstName} ${a.lastName}`)
			.join(", ");
		const keywords = s.keywords.map((k) => k.keyword.name).join(", ");
		const track = s.track?.name ?? "";

		return [
			String(s.sequentialNumber),
			escapeCsvField(s.title),
			escapeCsvField(mainName),
			escapeCsvField(coAuthors),
			escapeCsvField(keywords),
			escapeCsvField(track),
		].join(",");
	});

	return [header, ...rows].join("\n");
}

async function fetchFileBuffer(storageKey: string): Promise<Buffer> {
	const { body } = await getFileContent(storageKey);
	// body may be Web ReadableStream or Node Readable depending on AWS SDK runtime
	const stream =
		body instanceof Readable
			? body
			: Readable.fromWeb(body as import("node:stream/web").ReadableStream);
	const chunks: Buffer[] = [];
	for await (const chunk of stream) {
		chunks.push(Buffer.from(chunk));
	}
	return Buffer.concat(chunks);
}

export async function createSubmissionsZipStream(
	submissions: ExportSubmission[],
): Promise<Readable> {
	const archive = archiver("zip", { store: true });

	// Fetch all file contents in parallel, then append sequentially
	const fileEntries = await Promise.all(
		submissions.map(async (s) => {
			const file = s.currentVersion?.file;
			if (file) {
				try {
					const buffer = await fetchFileBuffer(file.storageKey);
					const ext = getFileExtension(file.originalName);
					return { name: `${s.sequentialNumber}${ext}`, data: buffer };
				} catch {
					// Fall through to text content
				}
			}
			const content = s.currentVersion?.content || s.content;
			return { name: `${s.sequentialNumber}.txt`, data: content };
		}),
	);

	for (const entry of fileEntries) {
		archive.append(entry.data, { name: entry.name });
	}

	archive.append(buildCsv(submissions), { name: "submissions.csv" });

	void archive.finalize();

	return archive;
}
