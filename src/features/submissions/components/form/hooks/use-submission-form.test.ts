// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SubmissionTypeConfig } from "@/features/settings/types";
import type {
	ActiveSubmissionType,
	SubmissionFormData,
	ValidationSettings,
} from "../submission-form-types";
import { useSubmissionForm } from "./use-submission-form";

vi.mock("@/shared/hooks/use-session", () => ({
	useSession: () => ({ user: undefined }),
}));

vi.mock("@/shared/server/affiliations-fn", () => ({
	getAffiliationById: vi.fn(),
}));

const handleFileChange = vi.fn();
vi.mock("@/features/extraction/hooks/use-document-extraction", () => ({
	useDocumentExtraction: () => ({
		isExtracting: false,
		elapsedSeconds: 0,
		handleFileChange,
	}),
}));

const config = (
	overrides: Partial<SubmissionTypeConfig> = {},
): SubmissionTypeConfig => ({
	isActive: true,
	includeInPlanner: true,
	allowExhibitorPresentation: false,
	contentFormat: "TEXT",
	allowedExtensions: ["pdf"],
	requiredReviewers: 2,
	reviewMode: "DOUBLE_BLIND",
	reviewDeadlineDays: 14,
	requiresEditorDecision: true,
	enableScoring: true,
	scoringCriteria: [],
	enableConfidenceLevel: false,
	enableReviewAttachment: false,
	enableTrackSelection: false,
	...overrides,
});

const typeConfigs: ActiveSubmissionType[] = [
	{ type: "ABSTRACT", label: "Abstract", config: config() },
	{
		type: "FULL_PAPER",
		label: "Full paper",
		config: config({
			contentFormat: "FILE",
			allowedExtensions: ["pdf", "docx"],
		}),
	},
];

const validationSettings: ValidationSettings = {
	minTitleLength: 10,
	maxTitleLength: 200,
	minAbstractLength: 500,
	maxAbstractLength: 2000,
	minKeywords: 3,
	maxKeywords: 5,
	maxFileSize: 10_000_000,
	allowedFileTypes: ["pdf"],
	enableKeywords: true,
};

function render(
	overrides: Partial<Parameters<typeof useSubmissionForm>[0]> = {},
) {
	return renderHook(() =>
		useSubmissionForm({
			onSubmit: vi.fn(),
			typeConfigs,
			validationSettings,
			availableTracks: [{ id: "t1", name: "Track 1" }],
			...overrides,
		}),
	);
}

describe("useSubmissionForm", () => {
	beforeEach(() => {
		handleFileChange.mockClear();
	});

	it("defaults to the first type config and exposes derived state", () => {
		const { result } = render();

		expect(result.current.selectedType).toBe("ABSTRACT");
		expect(result.current.isFileFormat).toBe(false);
		expect(result.current.acceptString).toBe(".pdf");
		expect(result.current.activeTracks).toEqual([
			{ id: "t1", name: "Track 1" },
		]);
		expect(result.current.form.state.values.type).toBe("ABSTRACT");
	});

	it("seeds values from initialData", () => {
		const initialData: Partial<SubmissionFormData> = {
			type: "FULL_PAPER",
			title: "Seeded title",
		};
		const { result } = render({ initialData });

		expect(result.current.selectedType).toBe("FULL_PAPER");
		expect(result.current.form.state.values.title).toBe("Seeded title");
	});

	it("selectType switches the type and clears content when moving to FILE format", () => {
		const { result } = render();

		act(() => {
			result.current.form.setFieldValue("content", "draft body");
		});
		act(() => {
			result.current.selectType("FULL_PAPER");
		});

		expect(result.current.selectedType).toBe("FULL_PAPER");
		expect(result.current.isFileFormat).toBe(true);
		expect(result.current.form.state.values.content).toBe("");
		expect(result.current.form.state.values.contentFormat).toBe("FILE");
	});

	it("selectType clears the file when moving back to TEXT format", () => {
		const { result } = render({ initialData: { type: "FULL_PAPER" } });

		act(() => {
			result.current.form.setFieldValue(
				"file",
				new File(["x"], "paper.pdf", { type: "application/pdf" }),
			);
		});
		act(() => {
			result.current.selectType("ABSTRACT");
		});

		expect(result.current.form.state.values.file).toBeNull();
		expect(result.current.form.state.values.contentFormat).toBe("TEXT");
	});

	it("saveDraft delegates to onSaveDraft and toggles isSavingDraft", async () => {
		let resolveDraft: () => void = () => {};
		const onSaveDraft = vi.fn(
			() => new Promise<void>((resolve) => (resolveDraft = resolve)),
		);
		const { result } = render({ onSaveDraft });

		let draftCall: Promise<void> = Promise.resolve();
		act(() => {
			draftCall = result.current.saveDraft();
		});
		expect(result.current.isSavingDraft).toBe(true);

		await act(async () => {
			resolveDraft();
			await draftCall;
		});

		expect(onSaveDraft).toHaveBeenCalledOnce();
		await waitFor(() => expect(result.current.isSavingDraft).toBe(false));
	});

	it("saveDraft is a no-op without an onSaveDraft handler", async () => {
		const { result } = render();
		await act(async () => {
			await result.current.saveDraft();
		});
		expect(result.current.isSavingDraft).toBe(false);
	});
});
