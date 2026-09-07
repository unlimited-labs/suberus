import { useState } from "react";
import { toast } from "sonner";
import type { z } from "zod";
import { getErrorMessage } from "@/shared/lib/error-message";
import { detectEmailColumn } from "@/shared/lib/sheet-analysis";
import type {
	MappingTarget,
	Sheet,
	SheetMatchResult,
} from "@/shared/lib/sheet-mapping";

/**
 * What to do with an address that has no Suberus account. "block" is the
 * unresolved state an importer that cannot take strangers starts in, so the
 * admin has to say out loud that those people are dropped.
 */
export type UnmatchedChoice = "add" | "skip" | "block";

export type MappingRow = {
	column: number;
	target: MappingTarget | { kind: "skip" };
};

type Matched = {
	file: File;
	sheet: Sheet;
	emailColumn: number;
	result: SheetMatchResult;
	unmatched: UnmatchedChoice;
};

export type WizardState =
	| {
			step: "upload";
			picked: { file: File; sheet: Sheet; emailColumn: number } | null;
	  }
	| ({ step: "match" } & Matched)
	| ({ step: "mapping"; mapping: MappingRow[] } & Matched);

export type WizardStep = WizardState["step"];

const STEP_INDEX = {
	upload: 1,
	match: 2,
	mapping: 3,
} satisfies Record<WizardStep, number>;

export interface SheetWizardOptions<Payload> {
	parseSheet: (body: FormData) => Promise<Sheet>;
	matchSheet: (input: {
		sheet: Sheet;
		emailColumn: number;
	}) => Promise<SheetMatchResult>;
	createSchema: z.ZodType<Payload>;
	createFromSheet: (payload: Payload) => Promise<string>;
	onCreated: (id: string) => Promise<void> | void;
	/** "choose": add them or leave them out. "confirm": they can only be ignored,
	 * and the import waits until the admin says so. */
	unmatchedMode?: "choose" | "confirm";
	createLabel: string;
	createErrorMessage: string;
}

function createPayload(state: WizardState) {
	if (state.step !== "mapping") return null;
	return {
		sheet: state.sheet,
		emailColumn: state.emailColumn,
		unmatched: state.unmatched,
		ignoreUnmatched: state.unmatched === "skip",
		mapping: state.mapping.flatMap((row) =>
			row.target.kind === "skip"
				? []
				: [{ column: row.column, target: row.target }],
		),
	};
}

export function useSheetWizard<Payload>(options: SheetWizardOptions<Payload>) {
	const unmatchedMode = options.unmatchedMode ?? "choose";
	const [state, setState] = useState<WizardState>({
		step: "upload",
		picked: null,
	});
	const [busy, setBusy] = useState(false);

	// No `finally`: the statement form defeats the React Compiler's memoization
	// (see the app-wide removal in the doctor campaign). The catch swallows, so
	// the trailing setBusy runs on both paths.
	const run = async (task: () => Promise<void>, fallback: string) => {
		setBusy(true);
		try {
			await task();
		} catch (error) {
			toast.error(getErrorMessage(error, fallback));
		}
		setBusy(false);
	};

	const payload = createPayload(state);
	const parsed = payload ? options.createSchema.safeParse(payload) : null;
	const problems = state.step === "upload" ? [] : state.result.problems;
	const unresolvedUnmatched =
		state.step !== "upload" &&
		state.unmatched === "block" &&
		state.result.rows.some((row) => row.kind === "unknown");
	const recipientCount =
		state.step === "upload"
			? 0
			: state.result.rows.filter(
					(row) => row.kind === "user" || state.unmatched === "add",
				).length;

	return {
		state,
		busy,
		unmatchedMode,
		problems,
		unresolvedUnmatched,
		stepIndex: STEP_INDEX[state.step],
		recipientCount,
		createLabel: options.createLabel,
		mappingError: parsed?.error?.issues[0]?.message ?? null,
		canCreate:
			Boolean(parsed?.success) && recipientCount > 0 && !unresolvedUnmatched,

		reset: () => setState({ step: "upload", picked: null }),

		pickFile: (file: File | null) =>
			run(async () => {
				if (!file) {
					setState({ step: "upload", picked: null });
					return;
				}
				const body = new FormData();
				body.append("file", file);
				const sheet = await options.parseSheet(body);
				setState({
					step: "upload",
					picked: { file, sheet, emailColumn: detectEmailColumn(sheet) },
				});
			}, "Could not read the spreadsheet"),

		setEmailColumn: (emailColumn: number) =>
			setState((prev) =>
				prev.step === "upload" && prev.picked
					? { ...prev, picked: { ...prev.picked, emailColumn } }
					: prev,
			),

		toMatch: () =>
			run(async () => {
				if (state.step !== "upload" || !state.picked) return;
				const { file, sheet, emailColumn } = state.picked;
				const result = await options.matchSheet({ sheet, emailColumn });
				setState({
					step: "match",
					file,
					sheet,
					emailColumn,
					result,
					unmatched: unmatchedMode === "confirm" ? "block" : "skip",
				});
			}, "Could not check the recipients"),

		setUnmatched: (unmatched: UnmatchedChoice) =>
			setState((prev) =>
				prev.step === "upload" ? prev : { ...prev, unmatched },
			),

		toMapping: () =>
			setState((prev) =>
				prev.step === "match"
					? {
							...prev,
							step: "mapping",
							mapping: prev.sheet.columns.flatMap((_, column) =>
								column === prev.emailColumn
									? []
									: [{ column, target: { kind: "skip" as const } }],
							),
						}
					: prev,
			),

		setTarget: (column: number, target: MappingRow["target"]) =>
			setState((prev) =>
				prev.step === "mapping"
					? {
							...prev,
							mapping: prev.mapping.map((row) =>
								row.column === column ? { ...row, target } : row,
							),
						}
					: prev,
			),

		back: () =>
			setState((prev) => {
				if (prev.step === "mapping") return { ...prev, step: "match" };
				if (prev.step === "match") {
					return {
						step: "upload",
						picked: {
							file: prev.file,
							sheet: prev.sheet,
							emailColumn: prev.emailColumn,
						},
					};
				}
				return prev;
			}),

		create: () =>
			run(async () => {
				if (!parsed?.success) return;
				const id = await options.createFromSheet(parsed.data);
				await options.onCreated(id);
			}, options.createErrorMessage),
	};
}
