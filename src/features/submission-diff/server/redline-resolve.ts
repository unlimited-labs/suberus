import type { ResolvedHtml } from "./diff-version";

// Pure pair-resolution decisions, split out of redline.ts (which imports prisma
// and so can't be imported in vitest). The DB lookups stay in redline.ts; the
// branching that decides the outcome lives — and is tested — here.

/**
 * Classify a version pair's resolved artifacts:
 *  - `unavailable`: a side isn't normalized, or both are the same format but
 *    different toolchains (transient during a toolchain bump — never diff across
 *    toolchains, gotcha C3).
 *  - `format-changed`: both normalized but different formats (e.g. DOCX -> PDF) —
 *    no structural redline is possible across extractors.
 *  - `ready`: both normalized, same format + toolchain.
 */
export type PairKeys =
	| {
			status: "ready";
			oldHtmlKey: string;
			newHtmlKey: string;
			/** CSS of the newer version — styles the combined redline (classes are
			 * stable across versions, so one sheet covers both sides). */
			newCssKey: string | null;
	  }
	| { status: "format-changed" }
	| { status: "unavailable" };

export function classifyResolvedPair(
	oldRes: ResolvedHtml | null,
	newRes: ResolvedHtml | null,
): PairKeys {
	if (!oldRes || !newRes) return { status: "unavailable" };
	if (oldRes.kind !== newRes.kind) return { status: "format-changed" };
	if (oldRes.toolchain !== newRes.toolchain) return { status: "unavailable" };
	return {
		status: "ready",
		oldHtmlKey: oldRes.htmlKey,
		newHtmlKey: newRes.htmlKey,
		newCssKey: newRes.cssKey,
	};
}

/**
 * Pick the old version to diff against, enforcing the IDOR guard: a caller-
 * supplied `explicitOldVersionId` is honoured ONLY when it belongs to the
 * authorized submission, else the pair is unavailable. With no explicit id the
 * implicit previous version (already submission-scoped) is used.
 */
export function chooseOldVersionId(opts: {
	explicitOldVersionId?: string;
	explicitBelongsToSubmission: boolean;
	implicitPreviousId: string | null;
}): string | null {
	if (opts.explicitOldVersionId) {
		return opts.explicitBelongsToSubmission ? opts.explicitOldVersionId : null;
	}
	return opts.implicitPreviousId;
}
