import type { PrintDocument } from "@/features/planner/print/print-document-schema";
import type { XlsxSheetSpec } from "@/shared/lib/xlsx-types";
import { writeXlsxWorkbook } from "@/shared/server/xlsx-workbook";
import { renderDocx } from "./print-docx";

export type PrintRenderJob =
	| { kind: "docx"; doc: PrintDocument }
	| { kind: "xlsx"; sheets: XlsxSheetSpec[]; title: string };

export const renderJob = (job: PrintRenderJob): Promise<Buffer> =>
	job.kind === "docx"
		? renderDocx(job.doc)
		: writeXlsxWorkbook(job.sheets, job.title);
