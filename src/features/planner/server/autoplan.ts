import { PromisePool } from "@supercharge/promise-pool";
import { differenceInMinutes } from "date-fns";
import { env } from "@/env";
import { logger } from "@/logger.ts";
import { prisma } from "@/shared/server/db.server";
import { setJobCurrent, setJobStage } from "@/shared/server/job-progress";
import { generateWithLlm } from "@/shared/server/llm";
import { assignClustersToSessions } from "./autoplan-assign";
import {
	type AutoPlanProposal,
	AutoPlanProposalSchema,
	type AutoplanStage,
	type ProposedPresentation,
	type ProposedSession,
} from "./autoplan-types";
import { embedSubmissions } from "./embeddings";
import { authorKey } from "./schedule-issues";

const LABEL_MAX_ABSTRACT_CHARS = 1500;
const LABEL_MAX_TOKENS = 60;
const LABEL_TIMEOUT_MS = 180_000;
const LABEL_SYSTEM_PROMPT = `You name academic conference sessions. Given a list of presentations (title + abstract snippet), return a single concise English session title (4-8 words) that captures the shared theme. Respond with only the title, no quotes, no explanation.`;

const CLUSTER_API_TIMEOUT_MS = 60_000;
const CLUSTER_API_TOLERANCE = 1;

type AutoplanSubmission = {
	id: string;
	title: string;
	content: string;
	authors: { userId: string | null; email: string }[];
};

type AutoplanSession = {
	id: string;
	title: string;
	startAt: Date;
	endAt: Date;
	room: { name: string } | null;
};

interface ClusterApiResponse {
	clusters: { session_index: number; member_ids: string[] }[];
	target_per_session: number;
	size_min: number;
	size_max: number;
}

const reportStage = (jobId: string, stage: AutoplanStage, total: number) =>
	setJobStage(jobId, stage, total);

function cleanLlmTitle(raw: string): string {
	return raw
		.trim()
		.replace(/^["'`]|["'`]$/g, "")
		.replace(/\n.*$/s, "")
		.trim();
}

function summarizeErrors(errors: unknown[]): string {
	const counts = new Map<string, number>();
	for (const e of errors) {
		const msg = e instanceof Error ? e.message : String(e);
		counts.set(msg, (counts.get(msg) ?? 0) + 1);
	}
	return Array.from(counts.entries())
		.map(([msg, n]) => (n > 1 ? `${msg} (×${n})` : msg))
		.join("; ");
}

async function callClusterApi(
	items: { id: string; embedding: number[] }[],
	sessionCount: number,
): Promise<ClusterApiResponse> {
	if (!env.PLANNER_API_URL) throw new Error("PLANNER_API_URL not configured");
	const res = await fetch(`${env.PLANNER_API_URL}/v1/cluster`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			items,
			session_count: sessionCount,
			tolerance: CLUSTER_API_TOLERANCE,
		}),
		signal: AbortSignal.timeout(CLUSTER_API_TIMEOUT_MS),
	});
	if (!res.ok) {
		const body = await res.text();
		throw new Error(`Planner API ${res.status}: ${body.slice(0, 200)}`);
	}
	// SAFETY: shape is the service's documented response contract; a mismatch surfaces on first field read.
	return (await res.json()) as ClusterApiResponse;
}

async function loadAutoplanInputs(jobId: string): Promise<{
	submissions: AutoplanSubmission[];
	sessions: AutoplanSession[];
}> {
	await reportStage(jobId, "loading", 0);

	const sessions = await prisma.programSession.findMany({
		// applyAutoPlan wipes and retitles every target session, so sessions holding
		// a hand-placed invited talk are left out entirely.
		where: {
			untimedSlots: false,
			presentations: { none: { submission: { type: "INVITED" } } },
		},
		select: {
			id: true,
			title: true,
			startAt: true,
			endAt: true,
			room: { select: { name: true } },
		},
		orderBy: { startAt: "asc" },
	});

	if (sessions.length === 0) {
		throw new Error(
			"No program sessions exist — create session scaffold first",
		);
	}

	const sessionIds = sessions.map((s) => s.id);
	const submissions = await prisma.submission.findMany({
		// Only slots inside a target session are wiped by applyAutoPlan; a
		// submission parked anywhere else keeps its slot, so re-proposing it would
		// hit the unique submissionId on create.
		where: {
			status: "ACCEPTED",
			type: "ABSTRACT",
			OR: [
				{ presentationSlot: { is: null } },
				{ presentationSlot: { is: { sessionId: { in: sessionIds } } } },
			],
		},
		select: {
			id: true,
			title: true,
			content: true,
			authors: { select: { userId: true, email: true } },
		},
		orderBy: { createdAt: "asc" },
	});

	if (submissions.length === 0) {
		throw new Error("No accepted ABSTRACT submissions to plan");
	}

	if (sessions.length > submissions.length) {
		throw new Error(
			`More sessions (${sessions.length}) than submissions (${submissions.length})`,
		);
	}

	return { submissions, sessions };
}

async function clusterSubmissions(
	jobId: string,
	submissions: AutoplanSubmission[],
	sessionCount: number,
): Promise<ClusterApiResponse> {
	await reportStage(jobId, "embedding", submissions.length);
	const embeddings = await embedSubmissions(submissions, {
		onProgress: (done) => setJobCurrent(jobId, done),
	});

	await reportStage(jobId, "clustering", 0);
	return callClusterApi(embeddings, sessionCount);
}

async function labelCluster(
	presentations: { title: string; content: string }[],
): Promise<string> {
	const lines = presentations.map((p, i) => {
		const snippet = p.content.slice(0, LABEL_MAX_ABSTRACT_CHARS);
		return `${i + 1}. "${p.title}"\n   ${snippet}`;
	});
	const user = `Presentations:\n\n${lines.join("\n\n")}\n\nSession title:`;
	const raw = await generateWithLlm({
		system: LABEL_SYSTEM_PROMPT,
		user,
		maxTokens: LABEL_MAX_TOKENS,
		timeoutMs: LABEL_TIMEOUT_MS,
	});
	return cleanLlmTitle(raw);
}

function clusterAuthorKeys(
	clusters: ClusterApiResponse["clusters"],
	submissionMap: Map<string, AutoplanSubmission>,
): Set<string>[] {
	return clusters.map((c) => {
		const keys = new Set<string>();
		for (const id of c.member_ids) {
			const sub = submissionMap.get(id);
			if (!sub) continue;
			for (const au of sub.authors) {
				const k = authorKey(au);
				if (k !== null) keys.add(k);
			}
		}
		return keys;
	});
}

async function labelClusters(
	jobId: string,
	orderedClusters: ClusterApiResponse["clusters"],
	sessions: AutoplanSession[],
	assign: number[],
	submissionMap: Map<string, AutoplanSubmission>,
): Promise<ProposedSession[]> {
	await reportStage(jobId, "labeling", orderedClusters.length);

	let labeled = 0;
	const { results, errors } = await PromisePool.for(orderedClusters)
		.withConcurrency(env.LLM_CONCURRENCY)
		.process(async (c, i): Promise<ProposedSession> => {
			const sess = sessions[assign[i]];
			const members = c.member_ids
				.map((id) => submissionMap.get(id))
				.filter((s): s is AutoplanSubmission => s !== undefined);

			const title = await labelCluster(members);

			const presentations: ProposedPresentation[] = members.map((m) => ({
				submissionId: m.id,
				title: m.title,
			}));

			await setJobCurrent(jobId, ++labeled);

			return {
				sessionId: sess.id,
				originalTitle: sess.title,
				proposedTitle: title,
				roomName: sess.room?.name ?? null,
				startAt: sess.startAt.toISOString(),
				endAt: sess.endAt.toISOString(),
				presentations,
			};
		});

	if (errors.length > 0) {
		for (const e of errors) {
			logger.error(`[autoplan] labeling error for cluster:`, e);
		}
		throw new Error(
			`Labeling failed for ${errors.length}/${orderedClusters.length} cluster(s): ${summarizeErrors(errors)}`,
		);
	}

	return results;
}

export async function runAutoPlan(jobId: string): Promise<AutoPlanProposal> {
	const { submissions, sessions } = await loadAutoplanInputs(jobId);
	const cluster = await clusterSubmissions(jobId, submissions, sessions.length);

	const submissionMap = new Map(submissions.map((s) => [s.id, s]));
	const orderedClusters = cluster.clusters
		.slice()
		.sort((a, b) => a.session_index - b.session_index);
	const assign = assignClustersToSessions(
		clusterAuthorKeys(orderedClusters, submissionMap),
		sessions,
	);
	const proposedSessions = await labelClusters(
		jobId,
		orderedClusters,
		sessions,
		assign,
		submissionMap,
	);

	const proposal: AutoPlanProposal = {
		sessions: proposedSessions,
		stats: {
			submissionCount: submissions.length,
			sessionCount: sessions.length,
			targetPerSession: cluster.target_per_session,
			sizeMin: cluster.size_min,
			sizeMax: cluster.size_max,
		},
	};

	logger.info(
		`[autoplan] job ${jobId} done: ${proposedSessions.length} sessions, ${submissions.length} presentations`,
	);
	return proposal;
}

export interface ApplyResult {
	sessionsUpdated: number;
	slotsCreated: number;
	slotsDeleted: number;
}

/**
 * Distribute total session minutes across N slots.
 * Last slot absorbs the remainder so totals match exactly.
 */
export function distributeDurations(totalMin: number, count: number): number[] {
	if (count <= 0) return [];
	const base = Math.floor(totalMin / count);
	const remainder = totalMin - base * count;
	return Array.from({ length: count }, (_, i) =>
		i === count - 1 ? base + remainder : base,
	);
}

async function loadApplicableProposal(
	jobId: string,
): Promise<AutoPlanProposal> {
	const row = await prisma.autoplanProposal.findUnique({
		where: { jobId },
		include: { job: true },
	});
	if (!row) throw new Error(`Proposal for job ${jobId} not found`);
	if (row.job.status !== "done")
		throw new Error(`Job ${jobId} is not done (${row.job.status})`);
	if (row.appliedAt) throw new Error(`Job ${jobId} already applied`);

	return AutoPlanProposalSchema.parse(row.data);
}

export async function applyAutoPlan(jobId: string): Promise<ApplyResult> {
	const proposal = await loadApplicableProposal(jobId);
	const sessionIds = proposal.sessions.map((s) => s.sessionId);
	const submissionIds = proposal.sessions.flatMap((s) =>
		s.presentations.map((p) => p.submissionId),
	);

	const result = await prisma.$transaction(async (tx) => {
		// The proposal froze its targets; an invited talk added since would be
		// wiped by the delete below. Refuse rather than destroy it.
		const invited = await tx.presentationSlot.count({
			where: {
				sessionId: { in: sessionIds },
				submission: { type: "INVITED" },
			},
		});
		if (invited > 0) {
			throw new Error(
				"A session in this proposal now holds an invited talk — re-run the autoplanner",
			);
		}

		const doomed = {
			OR: [
				{ sessionId: { in: sessionIds } },
				{ submissionId: { in: submissionIds } },
			],
		};
		// Badges are an editorial choice about the talk, not about the slot, so they
		// survive the re-plan that replaces the slot carrying them.
		const badges = new Map(
			(
				await tx.presentationSlot.findMany({
					where: { ...doomed, badgeId: { not: null } },
					select: { submissionId: true, badgeId: true },
				})
			).map((slot) => [slot.submissionId, slot.badgeId]),
		);

		// Also by submissionId: a proposed talk moved out of a target session since
		// the proposal would otherwise survive and break the unique submissionId.
		const del = await tx.presentationSlot.deleteMany({ where: doomed });

		let slotsCreated = 0;
		for (const s of proposal.sessions) {
			await tx.programSession.update({
				where: { id: s.sessionId },
				data: { title: s.proposedTitle },
			});

			const sessionDurationMin = Math.max(
				1,
				differenceInMinutes(new Date(s.endAt), new Date(s.startAt)),
			);
			const durations = distributeDurations(
				sessionDurationMin,
				s.presentations.length,
			);
			if (durations.length === 0) continue;

			await tx.presentationSlot.createMany({
				data: s.presentations.map((p, i) => ({
					sessionId: s.sessionId,
					submissionId: p.submissionId,
					order: i,
					durationMin: durations[i],
					badgeId: badges.get(p.submissionId) ?? null,
				})),
			});
			slotsCreated += durations.length;
		}

		return {
			sessionsUpdated: proposal.sessions.length,
			slotsCreated,
			slotsDeleted: del.count,
		};
	});

	await prisma.autoplanProposal.update({
		where: { jobId },
		data: { appliedAt: new Date() },
	});

	logger.info(
		`[autoplan] job ${jobId} applied: ${result.sessionsUpdated} sessions, -${result.slotsDeleted}/+${result.slotsCreated} slots`,
	);
	return result;
}
