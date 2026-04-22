import type { UnscheduledSubmission } from "@/lib/server/planner/sessions";

export function suggestSessionName(
	submissions: UnscheduledSubmission[],
): string {
	if (submissions.length === 0) return "Session";

	const lcp = longestCommonPrefix(submissions.map((s) => s.title));
	if (lcp) {
		const words = lcp.trim().split(/\s+/);
		if (words.length >= 3)
			return words.slice(0, 6).join(" ").replace(/[:,]$/, "");
	}

	const keywordFreq = new Map<string, number>();
	for (const s of submissions) {
		for (const k of s.keywords) {
			keywordFreq.set(k.name, (keywordFreq.get(k.name) ?? 0) + 1);
		}
	}
	const topKw = [...keywordFreq.entries()].sort((a, b) => b[1] - a[1])[0];
	if (topKw && topKw[1] >= 2)
		return topKw[0][0].toUpperCase() + topKw[0].slice(1);

	const trackFreq = new Map<string, number>();
	for (const s of submissions) {
		if (s.trackName)
			trackFreq.set(s.trackName, (trackFreq.get(s.trackName) ?? 0) + 1);
	}
	const topTrack = [...trackFreq.entries()].sort((a, b) => b[1] - a[1])[0];
	if (topTrack && topTrack[1] >= 2) return topTrack[0];

	return "Session";
}

function longestCommonPrefix(strings: string[]): string {
	if (strings.length === 0) return "";
	let prefix = strings[0];
	for (let i = 1; i < strings.length; i++) {
		while (!strings[i].toLowerCase().startsWith(prefix.toLowerCase())) {
			prefix = prefix.slice(0, -1);
			if (!prefix) return "";
		}
	}
	return prefix;
}
