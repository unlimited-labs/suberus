import { describe, expect, it } from "vitest";
import type { ResolvedHtml } from "./diff-version";
import { chooseOldVersionId, classifyResolvedPair } from "./redline-resolve";

const res = (over: Partial<ResolvedHtml> = {}): ResolvedHtml => ({
	htmlKey: "version-diff/html/a.html",
	cssKey: null,
	kind: "DOCX",
	toolchain: "pandoc|cfg|1",
	...over,
});

describe("classifyResolvedPair", () => {
	it("unavailable when a side is not normalized", () => {
		expect(classifyResolvedPair(null, res()).status).toBe("unavailable");
		expect(classifyResolvedPair(res(), null).status).toBe("unavailable");
	});

	it("format-changed when the kinds differ (DOCX -> PDF)", () => {
		expect(
			classifyResolvedPair(res({ kind: "DOCX" }), res({ kind: "PDF" })).status,
		).toBe("format-changed");
	});

	it("unavailable when the same kind but different toolchains (gotcha C3)", () => {
		expect(
			classifyResolvedPair(res({ toolchain: "old" }), res({ toolchain: "new" }))
				.status,
		).toBe("unavailable");
	});

	it("ready with both html keys when kind + toolchain match", () => {
		const out = classifyResolvedPair(
			res({ htmlKey: "old.html" }),
			res({ htmlKey: "new.html", cssKey: "new.css" }),
		);
		expect(out).toEqual({
			status: "ready",
			oldHtmlKey: "old.html",
			newHtmlKey: "new.html",
			newCssKey: "new.css",
		});
	});
});

describe("chooseOldVersionId (IDOR guard)", () => {
	it("rejects an explicit oldVersionId from another submission", () => {
		expect(
			chooseOldVersionId({
				explicitOldVersionId: "v-other",
				explicitBelongsToSubmission: false,
				implicitPreviousId: "v-prev",
			}),
		).toBeNull();
	});

	it("honours an explicit oldVersionId that belongs to the submission", () => {
		expect(
			chooseOldVersionId({
				explicitOldVersionId: "v-own",
				explicitBelongsToSubmission: true,
				implicitPreviousId: null,
			}),
		).toBe("v-own");
	});

	it("falls back to the implicit previous version when none is given", () => {
		expect(
			chooseOldVersionId({
				explicitBelongsToSubmission: false,
				implicitPreviousId: "v-prev",
			}),
		).toBe("v-prev");
	});

	it("is unavailable when there is no previous version", () => {
		expect(
			chooseOldVersionId({
				explicitBelongsToSubmission: false,
				implicitPreviousId: null,
			}),
		).toBeNull();
	});
});
