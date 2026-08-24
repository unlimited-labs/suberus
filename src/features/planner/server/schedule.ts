import { getSetting, setSetting } from "@/features/settings/server/settings";
import { prisma } from "@/shared/server/db.server";
import {
	detectAuthorTimeClashes,
	detectPresenterParallelSessions,
} from "./author-conflicts";
import { getPlannerIncludedTypes } from "./included-types";
import {
	findPairwiseOverlapIssues,
	overlaps,
	type ScheduleIssue,
} from "./schedule-issues";
import { computeSessionUsage, freeSlotsFor } from "./session-usage";

export type ScheduleStatus = "DRAFT" | "DRAFT_PUBLISHED" | "PUBLISHED";

export interface ScheduleState {
	status: ScheduleStatus;
	publishedAt?: string;
	publishedBy?: string;
}

export async function getScheduleState(): Promise<ScheduleState> {
	return getSetting("SCHEDULE_STATE");
}

export async function publishSchedule(userId: string): Promise<void> {
	await setSetting("SCHEDULE_STATE", {
		status: "PUBLISHED",
		publishedAt: new Date().toISOString(),
		publishedBy: userId,
	});
}

export async function publishScheduleDraft(userId: string): Promise<void> {
	await setSetting("SCHEDULE_STATE", {
		status: "DRAFT_PUBLISHED",
		publishedAt: new Date().toISOString(),
		publishedBy: userId,
	});
}

export async function unpublishSchedule(): Promise<void> {
	await setSetting("SCHEDULE_STATE", { status: "DRAFT" });
}

export async function clearPlan(): Promise<void> {
	const state = await getScheduleState();
	if (state.status === "PUBLISHED") {
		throw new Error("Unpublish the program before clearing the plan");
	}
	await prisma.$transaction(async (tx) => {
		// Slots cascade with their session; their INVITED placeholders would not.
		const invited = await tx.presentationSlot.findMany({
			where: { submission: { type: "INVITED" } },
			select: { submissionId: true },
		});
		await tx.programSession.deleteMany({});
		await tx.scheduleBreak.deleteMany({});
		if (invited.length > 0) {
			await tx.submission.deleteMany({
				where: { id: { in: invited.map((p) => p.submissionId) } },
			});
		}
	});
}

export interface CapacityInfo {
	talks: number;
	scheduled: number;
	sessions: number;
	sessionMinutes: number;
	usedMinutes: number;
	freeMinutes: number;
	freeSlots: number;
}

export async function getCapacity(): Promise<CapacityInfo> {
	const includedTypes = await getPlannerIncludedTypes();
	const [poolTalks, invitedTalks, sessionsWithSlots, defaultPresentationMin] =
		await Promise.all([
			prisma.submission.count({
				where: {
					status: { in: ["ACCEPTED", "CONDITIONALLY_ACCEPTED"] },
					type: { in: includedTypes },
				},
			}),
			// Invited talks never sit in the pool but do occupy a slot; count them on
			// both sides so "placed / total" cannot exceed 100%.
			prisma.presentationSlot.count({
				where: { submission: { type: "INVITED" } },
			}),
			prisma.programSession.findMany({
				select: {
					startAt: true,
					endAt: true,
					untimedSlots: true,
					presentations: { select: { durationMin: true } },
				},
			}),
			getSetting("CONFERENCE_DEFAULT_PRESENTATION_MIN"),
		]);
	const talks = poolTalks + invitedTalks;

	let sessionMinutes = 0;
	let usedMinutes = 0;
	let scheduled = 0;
	let freeSlots = 0;

	for (const s of sessionsWithSlots) {
		if (s.untimedSlots) {
			scheduled += s.presentations.length;
			continue;
		}
		const usage = computeSessionUsage(s);
		sessionMinutes += usage.sessionMin;
		usedMinutes += usage.usedMin;
		scheduled += s.presentations.length;
		freeSlots += freeSlotsFor(usage.freeMin, defaultPresentationMin);
	}

	return {
		talks,
		scheduled,
		sessions: sessionsWithSlots.length,
		freeSlots,
		sessionMinutes,
		usedMinutes,
		freeMinutes: Math.max(0, sessionMinutes - usedMinutes),
	};
}

export interface PublicProgramSession {
	id: string;
	title: string;
	startAt: Date;
	endAt: Date;
	untimedSlots: boolean;
	room: { id: string; name: string } | null;
	track: { id: string; name: string; color: string | null } | null;
	chairs: Array<{ firstName: string | null; lastName: string | null }>;
	presentations: Array<{
		id: string;
		order: number;
		durationMin: number;
		cancelled: boolean;
		submissionTitle: string;
		authors: Array<{ firstName: string; lastName: string; orderIndex: number }>;
	}>;
}

export interface PublicProgramBreak {
	id: string;
	kind: "BREAK" | "EVENT";
	title: string;
	description: string | null;
	location: string | null;
	locationUrl: string | null;
	startAt: Date;
	endAt: Date;
	room: { id: string; name: string } | null;
}

export interface PublicProgram {
	sessions: PublicProgramSession[];
	breaks: PublicProgramBreak[];
}

export async function isScheduleVisible(
	viewerCanPreviewDraft = false,
): Promise<boolean> {
	const state = await getSetting("SCHEDULE_STATE");
	return (
		state.status === "PUBLISHED" ||
		(state.status === "DRAFT_PUBLISHED" && viewerCanPreviewDraft)
	);
}

export async function getPublicProgram(
	viewerCanPreviewDraft = false,
): Promise<PublicProgram | null> {
	if (!(await isScheduleVisible(viewerCanPreviewDraft))) return null;

	const [sessions, breaks] = await Promise.all([
		prisma.programSession.findMany({
			include: {
				room: { select: { id: true, name: true } },
				track: { select: { id: true, name: true, color: true } },
				chairs: {
					include: { user: { select: { firstName: true, lastName: true } } },
				},
				presentations: {
					orderBy: { order: "asc" },
					include: {
						submission: {
							select: {
								title: true,
								authors: {
									select: { firstName: true, lastName: true, orderIndex: true },
									orderBy: { orderIndex: "asc" },
								},
							},
						},
					},
				},
			},
			orderBy: [{ startAt: "asc" }, { roomId: "asc" }],
		}),
		prisma.scheduleBreak.findMany({
			include: { room: { select: { id: true, name: true } } },
			orderBy: { startAt: "asc" },
		}),
	]);

	return {
		sessions: sessions.map((s) => ({
			id: s.id,
			title: s.title,
			startAt: s.startAt,
			endAt: s.endAt,
			untimedSlots: s.untimedSlots,
			room: s.room,
			track: s.track,
			chairs: s.chairs.map((c) => ({
				firstName: c.user.firstName,
				lastName: c.user.lastName,
			})),
			presentations: s.presentations.map((p) => ({
				id: p.id,
				order: p.order,
				durationMin: p.durationMin,
				cancelled: p.cancelled,
				submissionTitle: p.submission.title,
				authors: p.submission.authors,
			})),
		})),
		breaks: breaks.map((b) => ({
			id: b.id,
			kind: b.kind,
			title: b.title,
			description: b.description,
			location: b.location,
			locationUrl: b.locationUrl,
			startAt: b.startAt,
			endAt: b.endAt,
			room: b.room,
		})),
	};
}

export type { ScheduleIssue } from "./schedule-issues";

async function loadIssueData() {
	const [sessions, breaks] = await Promise.all([
		prisma.programSession.findMany({
			include: {
				chairs: {
					include: {
						user: { select: { firstName: true, lastName: true, email: true } },
					},
				},
				presentations: {
					include: {
						submission: {
							select: {
								id: true,
								title: true,
								status: true,
								authors: {
									select: {
										userId: true,
										firstName: true,
										lastName: true,
										email: true,
										isPresenter: true,
									},
								},
							},
						},
					},
				},
			},
		}),
		prisma.scheduleBreak.findMany({
			select: {
				id: true,
				roomId: true,
				startAt: true,
				endAt: true,
				title: true,
			},
		}),
	]);
	return { sessions, breaks };
}

type IssueSession = Awaited<
	ReturnType<typeof loadIssueData>
>["sessions"][number];
type IssueBreak = Awaited<ReturnType<typeof loadIssueData>>["breaks"][number];

function findSessionsWithoutChair(sessions: IssueSession[]): ScheduleIssue[] {
	return sessions.flatMap((s) =>
		s.chairs.length === 0
			? [
					{
						kind: "SESSION_WITHOUT_CHAIR" as const,
						message: `Session "${s.title}" has no chair`,
						sessionIds: [s.id],
					},
				]
			: [],
	);
}

function findOverbookedSessions(sessions: IssueSession[]): ScheduleIssue[] {
	const issues: ScheduleIssue[] = [];
	for (const s of sessions) {
		if (s.untimedSlots) continue;
		const { sessionMin, usedMin } = computeSessionUsage(s);
		if (usedMin > sessionMin) {
			issues.push({
				kind: "SLOT_DURATION_OVERFLOW",
				message: `Session "${s.title}" is over-booked: ${usedMin} min of talks scheduled, only ${sessionMin} min available`,
				sessionIds: [s.id],
			});
		}
	}
	return issues;
}

function findNonAcceptedSubmissions(sessions: IssueSession[]): ScheduleIssue[] {
	const issues: ScheduleIssue[] = [];
	for (const s of sessions) {
		for (const p of s.presentations) {
			const st = p.submission.status;
			if (st !== "ACCEPTED" && st !== "CONDITIONALLY_ACCEPTED") {
				const statusLabel = st.replace(/_/g, " ").toLowerCase();
				issues.push({
					kind: "NON_ACCEPTED_SUBMISSION",
					message: `"${p.submission.title}" in session "${s.title}" is ${statusLabel} (not accepted)`,
					sessionIds: [s.id],
				});
			}
		}
	}
	return issues;
}

function findBreakRoomConflicts(
	sessions: IssueSession[],
	breaks: IssueBreak[],
): ScheduleIssue[] {
	const issues: ScheduleIssue[] = [];
	for (const s of sessions) {
		if (!s.roomId) continue;
		for (const b of breaks) {
			if (b.roomId !== s.roomId) continue;
			if (overlaps(s, b)) {
				issues.push({
					kind: "ROOM_DOUBLE_BOOKED",
					message: `Break "${b.title}" overlaps session "${s.title}" in room`,
					sessionIds: [s.id],
				});
			}
		}
	}
	return issues;
}

export async function getScheduleIssues(): Promise<ScheduleIssue[]> {
	const [{ sessions, breaks }, bufferMin] = await Promise.all([
		loadIssueData(),
		getSetting("PLANNER_AUTHOR_BUFFER_MIN"),
	]);
	return [
		...findSessionsWithoutChair(sessions),
		...findOverbookedSessions(sessions),
		...findNonAcceptedSubmissions(sessions),
		...findPairwiseOverlapIssues(sessions),
		...detectAuthorTimeClashes(sessions, bufferMin),
		...detectPresenterParallelSessions(sessions),
		...findBreakRoomConflicts(sessions, breaks),
	];
}
