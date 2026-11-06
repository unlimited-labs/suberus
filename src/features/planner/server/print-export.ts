import { buildPrintDocument } from "@/features/planner/print/print-document-rules";
import type {
	PrintFormat,
	PrintOptions,
} from "@/features/planner/print/print-options-schema";
import {
	buildPrintProgram,
	type PrintProgram,
} from "@/features/planner/print/print-program-rules";
import { buildXlsxSheets } from "@/features/planner/print/print-xlsx-rules";
import { writeXlsxWorkbook } from "@/shared/server/xlsx-write";
import { renderDocx } from "./print-docx";
import { isIdmlAvailable, renderIdml } from "./print-idml-client";
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

async function documentFor(program: PrintProgram, options: PrintOptions) {
	return buildPrintDocument(program, options, { logo: await loadPrintLogo() });
}

const RENDERERS = {
	xlsx: async (program, options) =>
		writeXlsxWorkbook(
			buildXlsxSheets(program, options),
			`${program.conferenceName}${program.draft ? " (DRAFT)" : ""}`,
		),
	docx: async (program, options) =>
		renderDocx(await documentFor(program, options)),
	idml: async (program, options) => {
		if (!isIdmlAvailable())
			throw new PrintFormatUnavailableError(
				"InDesign export needs the document service (DOCX_API_URL).",
			);
		return renderIdml(await documentFor(program, options));
	},
} satisfies Record<
	PrintFormat,
	(program: PrintProgram, options: PrintOptions) => Promise<Buffer>
>;

export async function buildPrintFile(
	format: PrintFormat,
	options: PrintOptions,
): Promise<PrintFile> {
	const program = buildPrintProgram(await loadPrintSource(), options);
	const body = await RENDERERS[format](program, options);
	return {
		body: new Uint8Array(body),
		filename: `program${program.draft ? "-DRAFT" : ""}.${format}`,
		contentType: CONTENT_TYPES[format],
	};
}
