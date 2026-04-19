import type { UnscheduledSubmission } from "@/utils/program-sessions.server";

export type GroupingMode = "program-track" | "intake" | "keyword" | "presenter";

export interface SubmissionGroup {
	key: string;
	label: string;
	submissions: UnscheduledSubmission[];
}

const UNASSIGNED = "__unassigned__";
const NO_PROGRAM_TRACK = "__no_program_track__";

export function groupSubmissions(
	submissions: UnscheduledSubmission[],
	mode: GroupingMode,
	programTrackNames: Set<string>,
): SubmissionGroup[] {
	const buckets = new Map<
		string,
		{ label: string; items: UnscheduledSubmission[] }
	>();
	const push = (key: string, label: string, item: UnscheduledSubmission) => {
		const b = buckets.get(key);
		if (b) b.items.push(item);
		else buckets.set(key, { label, items: [item] });
	};

	for (const s of submissions) {
		if (mode === "intake") {
			if (s.trackName) push(s.trackName, s.trackName, s);
			else push(UNASSIGNED, "Unassigned", s);
		} else if (mode === "program-track") {
			if (s.trackName && programTrackNames.has(s.trackName))
				push(s.trackName, s.trackName, s);
			else push(NO_PROGRAM_TRACK, "No program track", s);
		} else if (mode === "keyword") {
			const kw = s.keywords[0];
			if (kw) push(kw.id, kw.name, s);
			else push(UNASSIGNED, "No keywords", s);
		} else if (mode === "presenter") {
			const a = s.authors[0];
			if (a) {
				const key = `${a.firstName} ${a.lastName}`.toLowerCase();
				push(key, `${a.firstName} ${a.lastName}`, s);
			} else push(UNASSIGNED, "No author", s);
		}
	}

	const groups: SubmissionGroup[] = Array.from(buckets.entries()).map(
		([key, { label, items }]) => ({ key, label, submissions: items }),
	);
	groups.sort((a, b) => {
		const aEmpty = a.key === UNASSIGNED || a.key === NO_PROGRAM_TRACK;
		const bEmpty = b.key === UNASSIGNED || b.key === NO_PROGRAM_TRACK;
		if (aEmpty !== bEmpty) return aEmpty ? 1 : -1;
		if (b.submissions.length !== a.submissions.length)
			return b.submissions.length - a.submissions.length;
		return a.label.localeCompare(b.label);
	});
	return groups;
}

export function matchesSearch(s: UnscheduledSubmission, q: string): boolean {
	if (!q) return true;
	const ql = q.toLowerCase();
	if (s.title.toLowerCase().includes(ql)) return true;
	if (
		s.authors.some(
			(a) =>
				a.firstName.toLowerCase().includes(ql) ||
				a.lastName.toLowerCase().includes(ql),
		)
	)
		return true;
	if (s.keywords.some((k) => k.name.toLowerCase().includes(ql))) return true;
	if (s.trackName?.toLowerCase().includes(ql)) return true;
	return false;
}
