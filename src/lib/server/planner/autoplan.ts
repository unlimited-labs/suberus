import { PromisePool } from "@supercharge/promise-pool";
import { prisma } from "@/db.server";
import { env } from "@/env";
import { logger } from "@/logger.ts";
import { generateWithLlm } from "../llm";
import {
	createJob,
	getJob,
	setProgress,
	setStage,
	updateJob,
} from "./autoplan-queue";
import type {
	AutoPlanProposal,
	ProposedPresentation,
	ProposedSession,
} from "./autoplan-types";
import { embedSubmissions } from "./embeddings";

const LABEL_MAX_ABSTRACT_CHARS = 1500;
const LABEL_MAX_TOKENS = 60;
const LABEL_SYSTEM_PROMPT = `You name academic conference sessions. Given a list of presentations (title + abstract snippet), return a single concise English session title (4-8 words) that captures the shared theme. Respond with only the title, no quotes, no explanation.`;

interface ClusterApiResponse {
	clusters: { session_index: number; member_ids: string[] }[];
	target_per_session: number;
	size_min: number;
	size_max: number;
}

async function callClusterApi(
	items: { id: string; embedding: number[] }[],
	sessionCount: number,
): Promise<ClusterApiResponse> {
	if (!env.PLANNER_API_URL) throw new Error("PLANNER_API_URL not configured");
	const res = await fetch(`${env.PLANNER_API_URL}/cluster`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			items,
			session_count: sessionCount,
			tolerance: 1,
		}),
		signal: AbortSignal.timeout(60_000),
	});
	if (!res.ok) {
		const body = await res.text();
		throw new Error(`Planner API ${res.status}: ${body.slice(0, 200)}`);
	}
	return (await res.json()) as ClusterApiResponse;
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
		timeoutMs: 180_000,
	});
	return raw
		.trim()
		.replace(/^["'`]|["'`]$/g, "")
		.replace(/\n.*$/s, "")
		.trim();
}

export async function startAutoPlan(): Promise<string> {
	const job = createJob();
	// Fire and forget — don't await
	runAutoPlan(job.id).catch((e: unknown) => {
		logger.error(`[autoplan] job ${job.id} failed:`, e);
		updateJob(job.id, {
			status: "error",
			error: e instanceof Error ? e.message : String(e),
		});
	});
	return job.id;
}

async function runAutoPlan(jobId: string): Promise<void> {
	setStage(jobId, "loading", 0);

	const submissions = await prisma.submission.findMany({
		where: { status: "ACCEPTED", type: "ABSTRACT" },
		select: { id: true, title: true, content: true },
		orderBy: { createdAt: "asc" },
	});

	if (submissions.length === 0) {
		throw new Error("No accepted ABSTRACT submissions to plan");
	}

	const sessions = await prisma.programSession.findMany({
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

	if (sessions.length > submissions.length) {
		throw new Error(
			`More sessions (${sessions.length}) than submissions (${submissions.length})`,
		);
	}

	setStage(jobId, "embedding", submissions.length);
	const allEmbeddings = await embedSubmissions(submissions, {
		onProgress: (done) => setProgress(jobId, done),
	});

	setStage(jobId, "clustering", 0);
	const cluster = await callClusterApi(allEmbeddings, sessions.length);

	setStage(jobId, "labeling", cluster.clusters.length);
	const submissionMap = new Map(submissions.map((s) => [s.id, s]));

	const orderedClusters = cluster.clusters
		.slice()
		.sort((a, b) => a.session_index - b.session_index);

	let labeled = 0;
	const { results: proposedSessions, errors: labelErrors } =
		await PromisePool.for(orderedClusters)
			.withConcurrency(env.LLM_CONCURRENCY)
			.process(async (c, i): Promise<ProposedSession> => {
				const sess = sessions[i];
				const members = c.member_ids
					.map((id) => submissionMap.get(id))
					.filter((s): s is (typeof submissions)[number] => s !== undefined);

				const title = await labelCluster(members);

				const presentations: ProposedPresentation[] = members.map((m) => ({
					submissionId: m.id,
					title: m.title,
				}));

				setProgress(jobId, ++labeled);

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

	if (labelErrors.length > 0) {
		throw new Error(
			`Labeling failed for ${labelErrors.length} cluster(s): ${labelErrors.map((e) => e.message).join("; ")}`,
		);
	}

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

	updateJob(jobId, {
		status: "done",
		progress: { stage: "done", current: 1, total: 1 },
		proposal,
	});
	logger.info(
		`[autoplan] job ${jobId} done: ${proposedSessions.length} sessions, ${submissions.length} presentations`,
	);
}

export interface ApplyResult {
	sessionsUpdated: number;
	slotsCreated: number;
	slotsDeleted: number;
}

export async function applyAutoPlan(jobId: string): Promise<ApplyResult> {
	const job = getJob(jobId);
	if (!job) throw new Error(`Job ${jobId} not found or expired`);
	if (job.status !== "done" || !job.proposal)
		throw new Error(`Job ${jobId} is not in 'done' state (${job.status})`);
	if (job.appliedAt) throw new Error(`Job ${jobId} already applied`);

	const proposal = job.proposal;
	const sessionIds = proposal.sessions.map((s) => s.sessionId);

	const result = await prisma.$transaction(async (tx) => {
		const del = await tx.presentationSlot.deleteMany({
			where: { sessionId: { in: sessionIds } },
		});

		let slotsCreated = 0;
		for (const s of proposal.sessions) {
			await tx.programSession.update({
				where: { id: s.sessionId },
				data: { title: s.proposedTitle },
			});

			const sessionDurationMin = Math.max(
				1,
				Math.round(
					(new Date(s.endAt).getTime() - new Date(s.startAt).getTime()) /
						60_000,
				),
			);
			const n = s.presentations.length;
			if (n === 0) continue;

			const baseDuration = Math.floor(sessionDurationMin / n);
			const remainder = sessionDurationMin - baseDuration * n;

			await tx.presentationSlot.createMany({
				data: s.presentations.map((p, i) => ({
					sessionId: s.sessionId,
					submissionId: p.submissionId,
					order: i,
					// Give the remainder to the last slot so totals match session length exactly.
					durationMin: i === n - 1 ? baseDuration + remainder : baseDuration,
				})),
			});
			slotsCreated += n;
		}

		return {
			sessionsUpdated: proposal.sessions.length,
			slotsCreated,
			slotsDeleted: del.count,
		};
	});

	updateJob(jobId, { appliedAt: new Date() });
	logger.info(
		`[autoplan] job ${jobId} applied: ${result.sessionsUpdated} sessions, -${result.slotsDeleted}/+${result.slotsCreated} slots`,
	);
	return result;
}
