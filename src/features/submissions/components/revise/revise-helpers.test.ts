import { describe, expect, it } from "vitest";
import { FILE_ACCEPT_ATTRIBUTE } from "@/features/settings/file-types";
import {
	buildAcceptString,
	buildRevisionRequest,
	canReviseSubmission,
	isRevisableSubmission,
	prepareRevisionView,
	resolveIsFileFormat,
} from "./revise-helpers";

describe("canReviseSubmission", () => {
	it("allows the two editor-requested revision states", () => {
		expect(canReviseSubmission("REVISE_REQUIRED")).toBe(true);
		expect(canReviseSubmission("CONDITIONALLY_ACCEPTED")).toBe(true);
	});

	it("rejects any other state", () => {
		for (const s of ["SUBMITTED", "UNDER_REVIEW", "ACCEPTED", "REJECTED"]) {
			expect(canReviseSubmission(s)).toBe(false);
		}
	});
});

describe("resolveIsFileFormat", () => {
	it("is true only for FILE content format", () => {
		expect(resolveIsFileFormat({ config: { contentFormat: "FILE" } })).toBe(
			true,
		);
		expect(resolveIsFileFormat({ config: { contentFormat: "TEXT" } })).toBe(
			false,
		);
	});

	it("defaults to TEXT (not file) when type config is missing", () => {
		expect(resolveIsFileFormat(undefined)).toBe(false);
	});
});

describe("buildAcceptString", () => {
	it("prefixes and joins provided extensions", () => {
		expect(buildAcceptString(["pdf", "docx"])).toBe(".pdf,.docx");
	});

	it("falls back to the global accept attribute when empty", () => {
		expect(buildAcceptString([])).toBe(FILE_ACCEPT_ATTRIBUTE);
	});
});

describe("buildRevisionRequest", () => {
	it("carries fields and keeps a non-empty comment", () => {
		expect(
			buildRevisionRequest("s1", {
				title: "T",
				content: "C",
				comment: "note",
			}),
		).toEqual({
			submissionId: "s1",
			title: "T",
			content: "C",
			comment: "note",
		});
	});

	it("maps an empty comment to undefined", () => {
		expect(
			buildRevisionRequest("s1", { title: "T", content: "C", comment: "" })
				.comment,
		).toBeUndefined();
	});
});

describe("isRevisableSubmission", () => {
	it("allows an author in a revisable state", () => {
		expect(
			isRevisableSubmission({ role: "author", status: "REVISE_REQUIRED" }),
		).toBe(true);
	});

	it("blocks co-authors even in a revisable state", () => {
		expect(
			isRevisableSubmission({ role: "coauthor", status: "REVISE_REQUIRED" }),
		).toBe(false);
	});

	it("blocks authors in a non-revisable state", () => {
		expect(isRevisableSubmission({ role: "author", status: "ACCEPTED" })).toBe(
			false,
		);
	});
});

const file = {
	id: "f1",
	fileName: "v2.pdf",
	originalName: "paper.pdf",
	mimeType: "application/pdf",
	size: 10,
};

const detail = {
	submission: {
		type: "PAPER",
		status: "REVISE_REQUIRED",
		title: "Sub title",
		content: "Sub content",
		currentVersion: 2,
	},
	versions: [
		{ version: 1, title: "v1", content: "c1", file: null },
		{ version: 2, title: "v2", content: "c2", file },
	],
};

const fileType = {
	type: "PAPER",
	config: { contentFormat: "FILE", allowedExtensions: ["pdf"] },
};

describe("prepareRevisionView", () => {
	it("seeds from the current version and resolves file-format settings", () => {
		const view = prepareRevisionView(detail, [fileType], { maxFileSize: 25 });
		expect(view).toEqual({
			isConditional: false,
			isFileFormat: true,
			title: "v2",
			content: "c2",
			currentFile: file,
			acceptString: ".pdf",
			maxFileSize: 25,
		});
	});

	it("falls back to the submission and TEXT format when type/version absent", () => {
		const view = prepareRevisionView(
			{ ...detail, submission: { ...detail.submission, currentVersion: 9 } },
			[],
			{ maxFileSize: null },
		);
		expect(view.title).toBe("Sub title");
		expect(view.content).toBe("Sub content");
		expect(view.currentFile).toBeNull();
		expect(view.isFileFormat).toBe(false);
		expect(view.acceptString).toBe(FILE_ACCEPT_ATTRIBUTE);
		expect(view.maxFileSize).toBe(10);
	});

	it("marks conditional acceptance", () => {
		const view = prepareRevisionView(
			{
				...detail,
				submission: {
					...detail.submission,
					status: "CONDITIONALLY_ACCEPTED",
				},
			},
			[fileType],
			{},
		);
		expect(view.isConditional).toBe(true);
	});

	it("returns safe defaults for null data", () => {
		const view = prepareRevisionView(null, [], {});
		expect(view).toEqual({
			isConditional: false,
			isFileFormat: false,
			title: "",
			content: "",
			currentFile: null,
			acceptString: FILE_ACCEPT_ATTRIBUTE,
			maxFileSize: 10,
		});
	});
});
