import {
	buildPrintDocument,
	type PrintLogo,
} from "@/features/planner/print/print-document-rules";
import {
	IDML_UNAVAILABLE,
	type PrintFormat,
	type PrintOptions,
	printFileName,
} from "@/features/planner/print/print-options-schema";
import {
	buildPrintProgram,
	type PrintProgram,
} from "@/features/planner/print/print-program-rules";
import { buildXlsxSheets } from "@/features/planner/print/print-xlsx-rules";
import { writeXlsxWorkbook } from "@/shared/server/xlsx-write";
import { renderDocxOffThread } from "./print-docx-thread";
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

const RENDERERS = {
	xlsx: async (program, options) =>
		writeXlsxWorkbook(
			buildXlsxSheets(program, options),
			`${program.conferenceName}${program.draft ? " (DRAFT)" : ""}`,
		),
	docx: async (program, options, logo) =>
		renderDocxOffThread(buildPrintDocument(program, options, logo)),
	idml: async (program, options, logo) => {
		if (!isIdmlAvailable())
			throw new PrintFormatUnavailableError(IDML_UNAVAILABLE);
		return renderIdml(buildPrintDocument(program, options, logo));
	},
} satisfies Record<
	PrintFormat,
	(
		program: PrintProgram,
		options: PrintOptions,
		logo: PrintLogo | null,
	) => Promise<Buffer>
>;

const usesLogo = (format: PrintFormat, options: PrintOptions) =>
	format !== "xlsx" && options.showLogo && options.parts.includes("title");

export async function buildPrintFile(
	format: PrintFormat,
	options: PrintOptions,
): Promise<PrintFile> {
	const [source, logo] = await Promise.all([
		loadPrintSource(),
		usesLogo(format, options) ? loadPrintLogo() : null,
	]);
	const program = buildPrintProgram(source, options);
	const body = await RENDERERS[format](program, options, logo);
	return {
		body: new Uint8Array(body),
		filename: printFileName(format, program.draft),
		contentType: CONTENT_TYPES[format],
	};
}
