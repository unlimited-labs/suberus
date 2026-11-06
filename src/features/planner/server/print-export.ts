import { buildPrintDocument } from "@/features/planner/print/print-document-rules";
import type {
	PrintFormat,
	PrintOptions,
} from "@/features/planner/print/print-options-schema";
import { buildPrintProgram } from "@/features/planner/print/print-program-rules";
import { buildXlsxSheets } from "@/features/planner/print/print-xlsx-rules";
import { writeXlsxWorkbook } from "@/shared/server/xlsx-write";
import { renderDocx } from "./print-docx";
import { loadPrintLogo, loadPrintSource } from "./print-program";

const CONTENT_TYPES = {
	xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	idml: "application/vnd.adobe.indesign-idml-package",
} satisfies Record<PrintFormat, string>;

export interface PrintFile {
	body: Uint8Array<ArrayBuffer>;
	filename: string;
	contentType: string;
}

export class PrintFormatUnavailableError extends Error {}

export async function buildPrintFile(
	format: PrintFormat,
	options: PrintOptions,
): Promise<PrintFile> {
	const source = await loadPrintSource();
	const program = buildPrintProgram(source, options);
	const filename = `program${program.draft ? "-DRAFT" : ""}.${format}`;
	if (format === "docx") {
		const doc = buildPrintDocument(program, options, {
			logo: await loadPrintLogo(),
		});
		return {
			body: new Uint8Array(await renderDocx(doc)),
			filename,
			contentType: CONTENT_TYPES.docx,
		};
	}
	if (format !== "xlsx")
		throw new PrintFormatUnavailableError(
			`${format} export is not available yet`,
		);
	const title = `${program.conferenceName}${program.draft ? " (DRAFT)" : ""}`;
	return {
		body: new Uint8Array(
			writeXlsxWorkbook(buildXlsxSheets(program, options), title),
		),
		filename,
		contentType: CONTENT_TYPES[format],
	};
}
