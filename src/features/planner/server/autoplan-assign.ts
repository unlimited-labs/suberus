import { overlaps } from "./schedule-issues";

export interface AssignSession {
	startAt: Date;
	endAt: Date;
}

function sharesAuthor(a: Set<string>, b: Set<string>): boolean {
	const [small, big] = a.size < b.size ? [a, b] : [b, a];
	for (const k of small) if (big.has(k)) return true;
	return false;
}

function conflictCount(
	assign: number[],
	clusterKeys: Set<string>[],
	sessions: AssignSession[],
): number {
	let count = 0;
	for (let i = 0; i < assign.length; i++) {
		for (let j = i + 1; j < assign.length; j++) {
			if (!sharesAuthor(clusterKeys[i], clusterKeys[j])) continue;
			if (overlaps(sessions[assign[i]], sessions[assign[j]])) count++;
		}
	}
	return count;
}

// mutates `assign` in place, returns residual cost
function hillClimb(
	assign: number[],
	clusterKeys: Set<string>[],
	sessions: AssignSession[],
): number {
	let cost = conflictCount(assign, clusterKeys, sessions);
	while (cost > 0) {
		let bestDelta = 0;
		let bestSwap: [number, number] | null = null;
		for (let i = 0; i < assign.length; i++) {
			for (let j = i + 1; j < assign.length; j++) {
				[assign[i], assign[j]] = [assign[j], assign[i]];
				const delta = conflictCount(assign, clusterKeys, sessions) - cost;
				[assign[i], assign[j]] = [assign[j], assign[i]];
				if (delta < bestDelta) {
					bestDelta = delta;
					bestSwap = [i, j];
				}
			}
		}
		if (!bestSwap) break;
		[assign[bestSwap[0]], assign[bestSwap[1]]] = [
			assign[bestSwap[1]],
			assign[bestSwap[0]],
		];
		cost += bestDelta;
	}
	return cost;
}

function mulberry32(seed: number): () => number {
	let a = seed;
	return () => {
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function shuffledIndices(n: number, rng: () => number): number[] {
	const a = Array.from({ length: n }, (_, i) => i);
	for (let i = n - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

const RESTARTS = 20;

// ponytail: random-restart 2-swap hill-climb, O(n^4) per run — fine at conference scale
// (tens of sessions). Fixed seed keeps proposals reproducible. Swap to SA/DSATUR only if
// hundreds of parallel sessions ever appear. Back-to-back within-buffer clashes stay
// advisory-only.
export function assignClustersToSessions(
	clusterKeys: Set<string>[],
	sessions: AssignSession[],
): number[] {
	let best = clusterKeys.map((_, i) => i);
	let bestCost = hillClimb(best, clusterKeys, sessions);

	const rng = mulberry32(0x5eed);
	for (let r = 0; r < RESTARTS && bestCost > 0; r++) {
		const cand = shuffledIndices(clusterKeys.length, rng);
		const cost = hillClimb(cand, clusterKeys, sessions);
		if (cost < bestCost) {
			bestCost = cost;
			best = cand;
		}
	}

	return best;
}
