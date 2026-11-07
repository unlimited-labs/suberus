import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { savePrintOptionsFn } from "@/features/planner/api/print-export";
import {
	IDML_UNAVAILABLE,
	NO_SESSIONS,
	type PrintFormat,
	type PrintOptions,
	printFileName,
	printOptionsSchema,
} from "@/features/planner/print/print-options-schema";
import { getErrorMessage } from "@/shared/lib/error-message";

const errorBody = z.object({ error: z.string() });

interface ExportContext {
	format: PrintFormat;
	initialOptions: PrintOptions;
	draft: boolean;
	conferenceName: string;
	sessionCount: number;
	idmlAvailable: boolean;
}

async function downloadFile(
	format: PrintFormat,
	options: PrintOptions,
	fileName: string,
) {
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
	// Safari starts reading the blob after click() returns; revoking at once can cancel it.
	setTimeout(() => URL.revokeObjectURL(url), 60_000);
	try {
		await savePrintOptionsFn({ data: options });
	} catch (error) {
		toast.error(
			`File downloaded, but the options were not saved: ${getErrorMessage(error)}`,
		);
	}
}

function optionsError(options: PrintOptions) {
	const validation = printOptionsSchema.safeParse(options);
	if (validation.success) return null;
	const issue = validation.error.issues[0];
	return {
		message: issue?.message ?? "Check the options.",
		onParts: issue?.path[0] === "parts",
	};
}

function blockedReasonFor(
	format: PrintFormat,
	error: ReturnType<typeof optionsError>,
	sessionCount: number,
	idmlAvailable: boolean,
): string | null {
	if (sessionCount === 0) return NO_SESSIONS;
	if (format === "idml" && !idmlAvailable) return IDML_UNAVAILABLE;
	return error?.message ?? null;
}

export function usePrintExport({
	format,
	initialOptions,
	draft,
	conferenceName,
	sessionCount,
	idmlAvailable,
}: ExportContext) {
	const [options, setOptions] = useState(initialOptions);
	const fileName = printFileName(format, draft, conferenceName);
	const error = optionsError(options);
	const blockedReason = blockedReasonFor(
		format,
		error,
		sessionCount,
		idmlAvailable,
	);
	const partsError = error?.onParts ? error.message : null;

	const download = useMutation({
		mutationFn: () => downloadFile(format, options, fileName),
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const set = <K extends keyof PrintOptions>(key: K, value: PrintOptions[K]) =>
		setOptions((o) => ({ ...o, [key]: value }));

	return { options, set, fileName, blockedReason, partsError, download };
}
