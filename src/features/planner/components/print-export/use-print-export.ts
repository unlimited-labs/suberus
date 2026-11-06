import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { savePrintOptionsFn } from "@/features/planner/api/print-export";
import {
	type PrintFormat,
	type PrintOptions,
	printOptionsSchema,
} from "@/features/planner/print/print-options-schema";
import { getErrorMessage } from "@/shared/lib/error-message";

const errorBody = z.object({ error: z.string() });

export const FORMAT_META = {
	docx: { label: "Word", ext: "docx", hint: "Ready booklet, lightly editable" },
	idml: { label: "InDesign", ext: "idml", hint: "Handoff to a designer" },
	xlsx: { label: "Excel", ext: "xlsx", hint: "Raw data, one sheet per day" },
} satisfies Record<PrintFormat, { label: string; ext: string; hint: string }>;

interface ExportContext {
	format: PrintFormat;
	initialOptions: PrintOptions;
	draft: boolean;
	sessionCount: number;
	idmlAvailable: boolean;
}

async function downloadFile(
	format: PrintFormat,
	options: PrintOptions,
	fileName: string,
) {
	await savePrintOptionsFn({ data: options });
	const params = new URLSearchParams({
		format,
		options: JSON.stringify(options),
	});
	const res = await fetch(`/api/admin/program/print?${params}`);
	if (!res.ok) {
		const body = errorBody.safeParse(await res.json().catch(() => null));
		throw new Error(
			body.success ? body.data.error : `Export failed (${res.status})`,
		);
	}
	const url = URL.createObjectURL(await res.blob());
	const link = document.createElement("a");
	link.href = url;
	link.download = fileName;
	link.click();
	URL.revokeObjectURL(url);
}

function blockedReasonFor(
	format: PrintFormat,
	options: PrintOptions,
	sessionCount: number,
	idmlAvailable: boolean,
): string | null {
	if (sessionCount === 0) return "The program has no sessions yet.";
	if (format === "idml" && !idmlAvailable)
		return "InDesign export needs the document service (DOCX_API_URL).";
	const validation = printOptionsSchema.safeParse(options);
	return validation.success
		? null
		: (validation.error.issues[0]?.message ?? "Check the options.");
}

export function usePrintExport({
	format,
	initialOptions,
	draft,
	sessionCount,
	idmlAvailable,
}: ExportContext) {
	const [options, setOptions] = useState(initialOptions);
	const fileName = `program${draft ? "-DRAFT" : ""}.${FORMAT_META[format].ext}`;
	const blockedReason = blockedReasonFor(
		format,
		options,
		sessionCount,
		idmlAvailable,
	);

	const download = useMutation({
		mutationFn: () => downloadFile(format, options, fileName),
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const set = <K extends keyof PrintOptions>(key: K, value: PrintOptions[K]) =>
		setOptions((o) => ({ ...o, [key]: value }));

	return { options, set, fileName, blockedReason, download };
}
