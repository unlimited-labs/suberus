import {
	buildPrintDocument,
	type PrintLogo,
	wantsLogo,
} from "@/features/planner/print/print-document-rules";
import {
	IDML_UNAVAILABLE,
	NO_SESSIONS,
	type PrintFormat,
	type PrintOptions,
	printFileName,
} from "@/features/planner/print/print-options-schema";
import {
	buildPrintProgram,
	type PrintProgram,
} from "@/features/planner/print/print-program-rules";
import { buildXlsxSheets } from "@/features/planner/print/print-xlsx-rules";
import { isIdmlAvailable, renderIdml } from "./print-idml-client";
import { loadPrintLogo, loadPrintSource } from "./print-program";
import { renderOffThread } from "./print-render";

const CONTENT_TYPES = {
	xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	idml: "application/vnd.adobe.indesign-idml-package",
} satisfies Record<PrintFormat, string>;

interface PrintFile {
	body: Uint8Array<ArrayBuffer>;
	filename: string;
	contentType: string;
}

export class PrintExportError extends Error {
	constructor(
		message: string,
		readonly status: 422 | 501,
	) {
		super(message);
	}
}

const RENDERERS = {
	xlsx: async (program, options) =>
		renderOffThread({
			kind: "xlsx",
			sheets: buildXlsxSheets(program, options),
			title: `${program.conferenceName}${program.draft ? " (DRAFT)" : ""}`,
		}),
	docx: async (program, options, logo) =>
		renderOffThread({
			kind: "docx",
			doc: buildPrintDocument(program, options, logo),
		}),
	idml: async (program, options, logo) => {
		if (!isIdmlAvailable()) throw new PrintExportError(IDML_UNAVAILABLE, 501);
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
	format !== "xlsx" && wantsLogo(options);

export async function buildPrintFile(
	format: PrintFormat,
	options: PrintOptions,
): Promise<PrintFile> {
	const [source, logo] = await Promise.all([
		loadPrintSource(),
		usesLogo(format, options) ? loadPrintLogo() : null,
	]);
	if (source.sessions.length === 0)
		throw new PrintExportError(NO_SESSIONS, 422);
	const program = buildPrintProgram(source, options);
	const body = await RENDERERS[format](program, options, logo);
	return {
		body: new Uint8Array(body),
		filename: printFileName(format, program.draft, program.conferenceName),
		contentType: CONTENT_TYPES[format],
	};
}
