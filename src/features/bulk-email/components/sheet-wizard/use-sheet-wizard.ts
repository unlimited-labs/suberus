import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
	bulkEmailCampaignsQueryOptions,
	createBulkEmailDraftFromSheet,
	matchBulkEmailSheet,
	parseBulkEmailSheet,
} from "@/features/bulk-email/api/bulk-email";
import { getErrorMessage } from "@/shared/lib/error-message";
import { detectEmailColumn } from "../../lib/sheet-analysis";
import {
	type MappingTarget,
	type Sheet,
	sheetCampaignCreateInput,
	type SheetMatchResult,
} from "../../validations";

export type MappingRow = {
	column: number;
	target: MappingTarget | { kind: "skip" };
};

type Matched = {
	sheet: Sheet;
	emailColumn: number;
	result: SheetMatchResult;
	unmatched: "add" | "skip";
};

export type WizardState =
	| { step: "upload"; picked: { sheet: Sheet; emailColumn: number } | null }
	| ({ step: "match" } & Matched)
	| ({ step: "mapping"; mapping: MappingRow[] } & Matched);

export type WizardStep = WizardState["step"];

const STEP_INDEX = {
	upload: 1,
	match: 2,
	mapping: 3,
} satisfies Record<WizardStep, number>;

function createPayload(state: WizardState) {
	if (state.step !== "mapping") return null;
	return {
		sheet: state.sheet,
		emailColumn: state.emailColumn,
		unmatched: state.unmatched,
		mapping: state.mapping.flatMap((row) =>
			row.target.kind === "skip"
				? []
				: [{ column: row.column, target: row.target }],
		),
	};
}

export function useSheetWizard(onCreated: () => void) {
	const [state, setState] = useState<WizardState>({
		step: "upload",
		picked: null,
	});
	const [busy, setBusy] = useState(false);
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const run = async (task: () => Promise<void>, fallback: string) => {
		setBusy(true);
		try {
			await task();
		} catch (error) {
			toast.error(getErrorMessage(error, fallback));
		} finally {
			setBusy(false);
		}
	};

	const payload = createPayload(state);
	const parsed = payload ? sheetCampaignCreateInput.safeParse(payload) : null;

	return {
		state,
		busy,
		stepIndex: STEP_INDEX[state.step],
		mappingError: parsed?.error?.issues[0]?.message ?? null,
		canCreate: Boolean(parsed?.success),

		reset: () => setState({ step: "upload", picked: null }),

		pickFile: (file: File | null) =>
			run(async () => {
				if (!file) {
					setState({ step: "upload", picked: null });
					return;
				}
				const body = new FormData();
				body.append("file", file);
				const sheet = await parseBulkEmailSheet({ data: body });
				setState({
					step: "upload",
					picked: { sheet, emailColumn: detectEmailColumn(sheet) },
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
				const { sheet, emailColumn } = state.picked;
				const result = await matchBulkEmailSheet({
					data: { sheet, emailColumn },
				});
				setState({
					step: "match",
					sheet,
					emailColumn,
					result,
					unmatched: "skip",
				});
			}, "Could not check the recipients"),

		setUnmatched: (unmatched: "add" | "skip") =>
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
						picked: { sheet: prev.sheet, emailColumn: prev.emailColumn },
					};
				}
				return prev;
			}),

		create: () =>
			run(async () => {
				if (!parsed?.success) return;
				const { campaignId } = await createBulkEmailDraftFromSheet({
					data: parsed.data,
				});
				await queryClient.invalidateQueries({
					queryKey: bulkEmailCampaignsQueryOptions().queryKey,
				});
				onCreated();
				await navigate({
					to: "/admin/bulk-email/$id",
					params: { id: campaignId },
				});
			}, "Could not create the campaign"),
	};
}
