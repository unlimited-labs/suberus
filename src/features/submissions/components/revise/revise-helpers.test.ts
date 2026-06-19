import { describe, expect, it } from "vitest";
import { FILE_ACCEPT_ATTRIBUTE } from "@/features/settings/file-types";
import type { Author } from "@/shared/types/author";
import {
	buildAcceptString,
	buildRevisionRequest,
	canReviseSubmission,
	isRevisableSubmission,
	prepareRevisionView,
	type RevisionFormData,
	resolveIsFileFormat,
	revisionReady,
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

const formAuthor: Author = {
	firstName: "Ann",
	lastName: "Lee",
	email: "ann@x.io",
	affiliationId: null,
	affiliationName: "MIT",
	isPresenter: true,
};

function makeFormData(over: Partial<RevisionFormData> = {}): RevisionFormData {
	return {
		title: "T",
		content: "C",
		comment: "note",
		file: null,
		authors: [formAuthor],
		keywords: ["k1"],
		...over,
	};
}

describe("buildRevisionRequest", () => {
	it("carries fields including authors/keywords and keeps a non-empty comment", () => {
		expect(buildRevisionRequest("s1", makeFormData())).toEqual({
			submissionId: "s1",
			title: "T",
			content: "C",
			comment: "note",
			authors: [formAuthor],
			keywords: ["k1"],
		});
	});

	it("maps an empty comment to undefined", () => {
		expect(
			buildRevisionRequest("s1", makeFormData({ comment: "" })).comment,
		).toBeUndefined();
	});
});

describe("revisionReady", () => {
	const valid: Author = {
		firstName: "Ann",
		lastName: "Lee",
		email: "ann@x.io",
		affiliationId: null,
		affiliationName: "MIT",
		isPresenter: true,
	};
	const coAuthor: Author = {
		firstName: "Bo",
		lastName: "Vo",
		email: "bo@x.io",
		affiliationId: null,
		affiliationName: "ETH",
		isPresenter: false,
	};

	it("accepts a title + one valid presenting author", () => {
		expect(revisionReady("A solid title", [valid])).toBe(true);
	});

	it("accepts multiple authors with exactly one presenter", () => {
		expect(revisionReady("Title", [valid, coAuthor])).toBe(true);
	});

	it("rejects an empty or whitespace-only title", () => {
		expect(revisionReady("", [valid])).toBe(false);
		expect(revisionReady("   ", [valid])).toBe(false);
	});

	it("rejects when there are no authors", () => {
		expect(revisionReady("Title", [])).toBe(false);
	});

	it("rejects when no author is the presenter", () => {
		expect(revisionReady("Title", [{ ...valid, isPresenter: false }])).toBe(
			false,
		);
	});

	it("rejects when more than one author is the presenter", () => {
		expect(
			revisionReady("Title", [valid, { ...coAuthor, isPresenter: true }]),
		).toBe(false);
	});

	it.each([
		["firstName", { firstName: "" }],
		["lastName", { lastName: " " }],
		["email", { email: "" }],
		["affiliationName", { affiliationName: "" }],
	])("rejects when an author's %s is blank", (_field, override) => {
		expect(revisionReady("Title", [{ ...valid, ...override }])).toBe(false);
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

const v1Author = {
	firstName: "Ann",
	lastName: "Lee",
	email: "ann@x.io",
	affiliation: "MIT",
	isPresenter: true,
};
const v2Author = { ...v1Author, lastName: "Vo" };

const detail = {
	submission: {
		type: "PAPER",
		status: "REVISE_REQUIRED",
		title: "Sub title",
		content: "Sub content",
		currentVersion: 2,
		authors: [v1Author],
		keywords: ["k-sub"],
	},
	versions: [
		{
			version: 1,
			title: "v1",
			content: "c1",
			file: null,
			authors: [v1Author],
			keywords: ["k1"],
		},
		{
			version: 2,
			title: "v2",
			content: "c2",
			file,
			authors: [v2Author],
			keywords: ["k2"],
		},
	],
};

const settings = {
	enableKeywords: true,
	maxKeywords: 5,
	extractionEnabled: true,
};

const fileType = {
	type: "PAPER",
	config: {
		contentFormat: "FILE",
		allowedExtensions: ["pdf"],
		maxFileSizeMb: 25,
	},
};

describe("prepareRevisionView", () => {
	it("seeds from the current version (incl. author/keyword snapshot) and resolves file-format settings", () => {
		const view = prepareRevisionView(detail, [fileType], settings);
		expect(view).toEqual({
			isConditional: false,
			isFileFormat: true,
			title: "v2",
			content: "c2",
			currentFile: file,
			acceptString: ".pdf",
			maxFileSize: 25,
			authors: [
				{
					firstName: "Ann",
					lastName: "Vo",
					email: "ann@x.io",
					affiliationId: null,
					affiliationName: "MIT",
					isPresenter: true,
				},
			],
			keywords: ["k2"],
			enableKeywords: true,
			maxKeywords: 5,
			extractionEnabled: true,
		});
	});

	it("falls back to the submission and TEXT format when type/version absent", () => {
		const view = prepareRevisionView(
			{ ...detail, submission: { ...detail.submission, currentVersion: 9 } },
			[],
			settings,
		);
		expect(view.title).toBe("Sub title");
		expect(view.content).toBe("Sub content");
		expect(view.currentFile).toBeNull();
		expect(view.isFileFormat).toBe(false);
		expect(view.acceptString).toBe(FILE_ACCEPT_ATTRIBUTE);
		expect(view.maxFileSize).toBe(10);
		// seeds from submission-level authors/keywords
		expect(view.authors).toEqual([
			{
				firstName: "Ann",
				lastName: "Lee",
				email: "ann@x.io",
				affiliationId: null,
				affiliationName: "MIT",
				isPresenter: true,
			},
		]);
		expect(view.keywords).toEqual(["k-sub"]);
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
			settings,
		);
		expect(view.isConditional).toBe(true);
	});

	it("returns safe defaults for null data", () => {
		const view = prepareRevisionView(null, [], settings);
		expect(view).toEqual({
			isConditional: false,
			isFileFormat: false,
			title: "",
			content: "",
			currentFile: null,
			acceptString: FILE_ACCEPT_ATTRIBUTE,
			maxFileSize: 10,
			authors: [],
			keywords: [],
			enableKeywords: true,
			maxKeywords: 5,
			extractionEnabled: true,
		});
	});
});
