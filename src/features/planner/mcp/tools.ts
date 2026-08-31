import { z } from "zod";
import {
	MCP_SCOPE_SCHEDULE_READ,
	MCP_SCOPE_SCHEDULE_WRITE,
} from "@/features/mcp/scopes";
import { applyAutoPlan } from "@/features/planner/server/autoplan";
import {
	getAutoPlanJob,
	startAutoPlan,
} from "@/features/planner/server/autoplan-job";
import {
	createBreak,
	deleteBreak,
	listBreaks,
	updateBreak,
} from "@/features/planner/server/breaks";
import {
	createInvitedTalk,
	updateInvitedTalk,
} from "@/features/planner/server/invited";
import {
	createPresentation,
	deletePresentation,
	reorderPresentations,
	setPresentationBadge,
	setProgramBadges,
	setPresentationCancelled,
	updatePresentationDuration,
} from "@/features/planner/server/presentations";
import {
	createRoom,
	deleteRoom,
	getAllRooms,
	updateRoom,
} from "@/features/planner/server/rooms";
import {
	getCapacity,
	getScheduleIssues,
	getScheduleState,
	publishSchedule,
	publishScheduleDraft,
	unpublishSchedule,
} from "@/features/planner/server/schedule";
import {
	assignChair,
	continueSeries,
	createSession,
	createSessionWithPresentations,
	deleteSession,
	listSessions,
	listUnscheduledSubmissions,
	removeChair,
	splitSession,
	updateSession,
} from "@/features/planner/server/sessions";
import { nextDay } from "@/features/planner/server/time-range";
import {
	createProgramTrack,
	deleteProgramTrack,
	getAllProgramTracks,
	importFromConferenceTracks,
	updateProgramTrack,
} from "@/features/planner/server/tracks";
import { tzLocalInputToUtc } from "@/features/planner/tz-datetime";
import {
	breakCreateInput,
	breakUpdateInput,
	idInput,
	invitedTalkCreateInput,
	invitedTalkUpdateInput,
	jobIdInput,
	presentationCreateInput,
	presentationDurationValue,
	presentationReorderInput,
	programBadgesSchema,
	programRangeInput,
	roomCreateInput,
	roomUpdateInput,
	sessionChairInput,
	sessionCreateInput,
	sessionSplitInput,
	sessionUpdateInput,
	sessionWithPresentationsInput,
	trackCreateInput,
	trackUpdateInput,
} from "@/features/planner/validations";
import { getSetting } from "@/features/settings/server/settings";
import {
	ADMIN_AND_EDITOR,
	defineTool,
	type McpTool,
} from "@/shared/server/mcp/define-tool";

const ISO_HINT =
	"Times are ISO-8601 instants with an offset, e.g. 2026-09-14T09:00:00Z.";

async function resolveProgramRange(
	input: z.infer<typeof programRangeInput>,
): Promise<{ from?: Date; to?: Date } | undefined> {
	if (input.day) {
		// Unset timezone must resolve to UTC here — the shared fallback reads the
		// host's zone, which on the server is the container's, not the organiser's.
		const zone = (await getSetting("CONFERENCE_TIMEZONE")) || "UTC";
		return {
			from: tzLocalInputToUtc(`${input.day}T00:00`, zone),
			to: tzLocalInputToUtc(`${nextDay(input.day)}T00:00`, zone),
		};
	}
	if (input.from || input.to) return { from: input.from, to: input.to };
	return undefined;
}

const getProgram = defineTool({
	name: "program_get",
	title: "Get the programme",
	description: `Read the programme in one call: rooms, tracks, sessions with their presentation slots, breaks and events, the publication state and capacity. Narrow it with day (YYYY-MM-DD, read in the conference timezone) or with from/to; rooms, tracks, state and capacity always cover the whole conference. ${ISO_HINT}`,
	input: programRangeInput,
	roles: ADMIN_AND_EDITOR,
	scope: MCP_SCOPE_SCHEDULE_READ,
	readOnly: true,
	async handler(input) {
		const range = await resolveProgramRange(input);
		const [rooms, tracks, sessions, breaks, state, capacity, badges] =
			await Promise.all([
				getAllRooms(),
				getAllProgramTracks(),
				listSessions(range),
				listBreaks(range),
				getScheduleState(),
				getCapacity(),
				getSetting("PROGRAM_BADGES"),
			]);
		return { range, state, capacity, rooms, tracks, sessions, breaks, badges };
	},
});

const getIssues = defineTool({
	name: "program_issues",
	title: "List programme issues",
	description:
		"List every scheduling conflict: chairs booked twice, authors or presenters in parallel sessions, double-booked rooms, sessions over their slot budget, sessions without a chair and non-accepted submissions on the programme.",
	input: z.object({}),
	roles: ADMIN_AND_EDITOR,
	scope: MCP_SCOPE_SCHEDULE_READ,
	readOnly: true,
	async handler() {
		return getScheduleIssues();
	},
});

const getUnscheduled = defineTool({
	name: "program_unscheduled",
	title: "List unscheduled submissions",
	description:
		"List accepted submissions of a presentable type that have no presentation slot yet. Use their ids with program_session_create or program_presentation_create.",
	input: z.object({}),
	roles: ADMIN_AND_EDITOR,
	scope: MCP_SCOPE_SCHEDULE_READ,
	readOnly: true,
	async handler() {
		const rows = await listUnscheduledSubmissions();
		return {
			total: rows.length,
			submissions: rows.map((r) => ({
				id: r.id,
				title: r.title,
				type: r.type,
				trackId: r.trackId,
				trackName: r.trackName,
				keywords: r.keywords.map((k) => k.name),
				authors: r.authors,
			})),
		};
	},
});

const roomCreate = defineTool({
	name: "program_room_create",
	title: "Create room",
	description:
		"Add a room to the programme. The name must be unique; order controls the column order in the planner.",
	input: roomCreateInput,
	roles: ADMIN_AND_EDITOR,
	scope: MCP_SCOPE_SCHEDULE_WRITE,
	async handler(input) {
		return createRoom(input);
	},
});

const roomUpdate = defineTool({
	name: "program_room_update",
	title: "Update room",
	description:
		"Change a room. Send only the fields to change; omitted fields keep their value.",
	input: roomUpdateInput,
	roles: ADMIN_AND_EDITOR,
	scope: MCP_SCOPE_SCHEDULE_WRITE,
	destructive: true,
	async handler({ id, ...rest }) {
		await updateRoom(id, rest);
		return { id };
	},
});

const roomDelete = defineTool({
	name: "program_room_delete",
	title: "Delete room",
	description:
		"Delete a room. Sessions and breaks held there are kept but lose their room.",
	input: idInput,
	roles: ADMIN_AND_EDITOR,
	scope: MCP_SCOPE_SCHEDULE_WRITE,
	destructive: true,
	async handler({ id }) {
		await deleteRoom(id);
		return { id };
	},
});

const trackCreate = defineTool({
	name: "program_track_create",
	title: "Create programme track",
	description:
		"Add a programme track (a thematic strand shown on the schedule). Colour is #RRGGBB.",
	input: trackCreateInput,
	roles: ADMIN_AND_EDITOR,
	scope: MCP_SCOPE_SCHEDULE_WRITE,
	async handler(input) {
		return createProgramTrack(input);
	},
});

const trackUpdate = defineTool({
	name: "program_track_update",
	title: "Update programme track",
	description: "Rename or recolour a programme track.",
	input: trackUpdateInput,
	roles: ADMIN_AND_EDITOR,
	scope: MCP_SCOPE_SCHEDULE_WRITE,
	destructive: true,
	async handler({ id, ...rest }) {
		await updateProgramTrack(id, rest);
		return { id };
	},
});

const trackDelete = defineTool({
	name: "program_track_delete",
	title: "Delete programme track",
	description:
		"Delete a programme track. Its sessions keep running, untracked.",
	input: idInput,
	roles: ADMIN_AND_EDITOR,
	scope: MCP_SCOPE_SCHEDULE_WRITE,
	destructive: true,
	async handler({ id }) {
		await deleteProgramTrack(id);
		return { id };
	},
});

const trackImport = defineTool({
	name: "program_track_import",
	title: "Import tracks from submission topics",
	description:
		"Create programme tracks from the submission intake topics that have no programme track yet.",
	input: z.object({}),
	roles: ADMIN_AND_EDITOR,
	scope: MCP_SCOPE_SCHEDULE_WRITE,
	async handler() {
		return importFromConferenceTracks();
	},
});

const sessionCreate = defineTool({
	name: "program_session_create",
	title: "Create session",
	description: `Create a programme session. Pass submissionIds together with slotDurationMin to fill it with presentations right away — every submission must be accepted, presentable and unscheduled. Omit the title to get an auto-numbered one. Set untimedSlots for a poster or lightning block: the session keeps its own start and end, its presentations get no individual times and no capacity limit, and autoplan leaves it alone (slotDurationMin then only seeds a placeholder value). ${ISO_HINT}`,
	input: sessionCreateInput.extend({
		slotDurationMin:
			sessionWithPresentationsInput.shape.slotDurationMin.optional(),
		submissionIds: sessionWithPresentationsInput.shape.submissionIds.optional(),
	}),
	roles: ADMIN_AND_EDITOR,
	scope: MCP_SCOPE_SCHEDULE_WRITE,
	async handler({ slotDurationMin, submissionIds, ...session }) {
		if (submissionIds?.length) {
			if (!slotDurationMin) {
				throw new Response(
					"slotDurationMin is required when submissionIds are given",
					{ status: 400 },
				);
			}
			return createSessionWithPresentations({
				...session,
				slotDurationMin,
				submissionIds,
			});
		}
		return createSession(session);
	},
});

const sessionUpdate = defineTool({
	name: "program_session_update",
	title: "Update session",
	description: `Change a session's title, track, room or times — this is also how a session is moved. Toggle untimedSlots to switch between a timed session and a poster / lightning block. ${ISO_HINT}`,
	input: sessionUpdateInput,
	roles: ADMIN_AND_EDITOR,
	scope: MCP_SCOPE_SCHEDULE_WRITE,
	destructive: true,
	async handler({ id, ...rest }) {
		await updateSession(id, rest);
		return { id };
	},
});

const sessionDelete = defineTool({
	name: "program_session_delete",
	title: "Delete session",
	description:
		"Delete a session together with its presentation slots. The submissions themselves return to the unscheduled pool.",
	input: idInput,
	roles: ADMIN_AND_EDITOR,
	scope: MCP_SCOPE_SCHEDULE_WRITE,
	destructive: true,
	async handler({ id }) {
		await deleteSession(id);
		return { id };
	},
});

const sessionChairAdd = defineTool({
	name: "program_session_chair_add",
	title: "Add session chair",
	description: "Assign a chair to a session. A session takes at most 3 chairs.",
	input: sessionChairInput,
	roles: ADMIN_AND_EDITOR,
	scope: MCP_SCOPE_SCHEDULE_WRITE,
	async handler({ sessionId, userId }) {
		await assignChair(sessionId, userId);
		return { sessionId, userId };
	},
});

const sessionChairRemove = defineTool({
	name: "program_session_chair_remove",
	title: "Remove session chair",
	description: "Remove a chair from a session.",
	input: sessionChairInput,
	roles: ADMIN_AND_EDITOR,
	scope: MCP_SCOPE_SCHEDULE_WRITE,
	destructive: true,
	async handler({ sessionId, userId }) {
		await removeChair(sessionId, userId);
		return { sessionId, userId };
	},
});

const sessionContinueSeries = defineTool({
	name: "program_session_continue_series",
	title: "Continue session series",
	description:
		"Create the next part of a session series: same track and length, starting when the given session ends. Numbers the original as part 1 when it isn't numbered yet.",
	input: idInput,
	roles: ADMIN_AND_EDITOR,
	scope: MCP_SCOPE_SCHEDULE_WRITE,
	async handler({ id }) {
		return continueSeries(id);
	},
});

const sessionSplit = defineTool({
	name: "program_session_split",
	title: "Split session",
	description:
		"Split a session after the given slot order: later presentations move to a new session that starts where the first one now ends.",
	input: sessionSplitInput,
	roles: ADMIN_AND_EDITOR,
	scope: MCP_SCOPE_SCHEDULE_WRITE,
	destructive: true,
	async handler({ sessionId, afterSlotOrder }) {
		return splitSession(sessionId, afterSlotOrder);
	},
});

const presentationCreate = defineTool({
	name: "program_presentation_create",
	title: "Schedule a presentation",
	description:
		"Put an accepted submission into a session as the next presentation slot. Rejected when the session has no room left for the requested duration.",
	input: presentationCreateInput,
	roles: ADMIN_AND_EDITOR,
	scope: MCP_SCOPE_SCHEDULE_WRITE,
	async handler(input) {
		return createPresentation(input);
	},
});

const presentationUpdate = defineTool({
	name: "program_presentation_update",
	title: "Update presentation",
	description:
		"Change a presentation's duration, mark it cancelled and/or set its badge. A cancelled slot stays on the programme, struck through. badgeId must be an id from program_get's badges; pass null to clear it.",
	input: idInput.extend({
		durationMin: presentationDurationValue.optional(),
		cancelled: z.boolean().optional(),
		badgeId: z.uuid().nullable().optional(),
	}),
	roles: ADMIN_AND_EDITOR,
	scope: MCP_SCOPE_SCHEDULE_WRITE,
	destructive: true,
	async handler({ id, durationMin, cancelled, badgeId }) {
		if (
			durationMin === undefined &&
			cancelled === undefined &&
			badgeId === undefined
		) {
			throw new Response("Pass durationMin, cancelled or badgeId", {
				status: 400,
			});
		}
		if (durationMin !== undefined) {
			await updatePresentationDuration(id, durationMin);
		}
		if (cancelled !== undefined) {
			await setPresentationCancelled(id, cancelled);
		}
		if (badgeId !== undefined) {
			await setPresentationBadge(id, badgeId);
		}
		return { id };
	},
});

const badgesSet = defineTool({
	name: "program_badges_set",
	title: "Set programme badges",
	description:
		"Replace the badge definitions shown on the public programme. Send the full list; badges missing from it are removed and stop rendering on the talks that used them. style 'badge' is a pill next to the title, 'ribbon' a diagonal corner ribbon. Colour is #RRGGBB.",
	input: z.object({ badges: programBadgesSchema }),
	roles: ["ADMIN"],
	scope: MCP_SCOPE_SCHEDULE_WRITE,
	destructive: true,
	async handler({ badges }) {
		await setProgramBadges(badges);
		return { badges };
	},
});

const invitedCreate = defineTool({
	name: "program_invited_create",
	title: "Add an invited talk",
	description:
		"Add a talk that never went through submission (keynote, invited lecture, sponsor talk) as the next slot in a session. Speakers (zero or more, each with firstName/lastName/affiliationName/isPresenter) and abstract are all optional; the item exists only inside the programme and never appears among submissions.",
	input: invitedTalkCreateInput,
	roles: ADMIN_AND_EDITOR,
	scope: MCP_SCOPE_SCHEDULE_WRITE,
	async handler(input, actor) {
		return createInvitedTalk(input, actor.id);
	},
});

const invitedUpdate = defineTool({
	name: "program_invited_update",
	title: "Edit an invited talk",
	description:
		"Change the title, speakers or abstract of an invited talk. Duration and cancellation go through program_presentation_update; deletion through program_presentation_delete.",
	input: invitedTalkUpdateInput,
	roles: ADMIN_AND_EDITOR,
	scope: MCP_SCOPE_SCHEDULE_WRITE,
	destructive: true,
	async handler({ id, ...fields }) {
		await updateInvitedTalk(id, fields);
		return { id };
	},
});

const presentationDelete = defineTool({
	name: "program_presentation_delete",
	title: "Unschedule a presentation",
	description:
		"Remove a presentation slot; the submission returns to the unscheduled pool and the remaining slots close the gap. An invited talk has no submission to return, so it is deleted outright.",
	input: idInput,
	roles: ADMIN_AND_EDITOR,
	scope: MCP_SCOPE_SCHEDULE_WRITE,
	destructive: true,
	async handler({ id }) {
		await deletePresentation(id);
		return { id };
	},
});

const presentationReorder = defineTool({
	name: "program_presentation_reorder",
	title: "Reorder presentations",
	description:
		"Set the running order inside a session. Pass every slot id of that session in the wanted order.",
	input: presentationReorderInput,
	roles: ADMIN_AND_EDITOR,
	scope: MCP_SCOPE_SCHEDULE_WRITE,
	destructive: true,
	async handler({ sessionId, orderedIds }) {
		await reorderPresentations(sessionId, orderedIds);
		return { sessionId };
	},
});

const breakCreate = defineTool({
	name: "program_break_create",
	title: "Create break or event",
	description: `Add a break (coffee, lunch) or a social event (dinner, trip) to the programme. Events carry a description, location and link; both may be tied to a room. ${ISO_HINT}`,
	input: breakCreateInput,
	roles: ADMIN_AND_EDITOR,
	scope: MCP_SCOPE_SCHEDULE_WRITE,
	async handler(input) {
		return createBreak(input);
	},
});

const breakUpdate = defineTool({
	name: "program_break_update",
	title: "Update break or event",
	description:
		"Change a break or event. Its kind cannot be changed — delete and recreate it to turn a break into an event.",
	input: breakUpdateInput,
	roles: ADMIN_AND_EDITOR,
	scope: MCP_SCOPE_SCHEDULE_WRITE,
	destructive: true,
	async handler({ id, ...rest }) {
		await updateBreak(id, rest);
		return { id };
	},
});

const breakDelete = defineTool({
	name: "program_break_delete",
	title: "Delete break or event",
	description: "Remove a break or event from the programme.",
	input: idInput,
	roles: ADMIN_AND_EDITOR,
	scope: MCP_SCOPE_SCHEDULE_WRITE,
	destructive: true,
	async handler({ id }) {
		await deleteBreak(id);
		return { id };
	},
});

const publish = defineTool({
	name: "program_publish",
	title: "Set programme visibility",
	description:
		"Set who can see the programme: DRAFT hides it, DRAFT_PUBLISHED shows it to admins and editors only, PUBLISHED makes it public.",
	input: z.object({
		status: z.enum(["DRAFT", "DRAFT_PUBLISHED", "PUBLISHED"]),
	}),
	roles: ["ADMIN"],
	scope: MCP_SCOPE_SCHEDULE_WRITE,
	destructive: true,
	async handler({ status }, actor) {
		if (status === "PUBLISHED") await publishSchedule(actor.id);
		else if (status === "DRAFT_PUBLISHED") await publishScheduleDraft(actor.id);
		else await unpublishSchedule();
		return getScheduleState();
	},
});

const autoplanStart = defineTool({
	name: "program_autoplan_start",
	title: "Start automatic planning",
	description:
		"Queue the autoplanner: it clusters unscheduled submissions by topic and proposes session titles and slot assignments. Returns a jobId to poll with program_autoplan_status. Requires the autoplanner to be enabled in the conference settings.",
	input: z.object({}),
	roles: ADMIN_AND_EDITOR,
	scope: MCP_SCOPE_SCHEDULE_WRITE,
	async handler(_input, actor) {
		return startAutoPlan(actor.id);
	},
});

const autoplanStatus = defineTool({
	name: "program_autoplan_status",
	title: "Get automatic planning status",
	description:
		"Read an autoplan job: progress, the proposal once it is done, and whether it has already been applied.",
	input: jobIdInput,
	roles: ADMIN_AND_EDITOR,
	scope: MCP_SCOPE_SCHEDULE_READ,
	readOnly: true,
	async handler({ jobId }) {
		const job = await getAutoPlanJob(jobId);
		if (job.notFound)
			throw new Response("Autoplan job not found", { status: 404 });
		return job;
	},
});

const autoplanApply = defineTool({
	name: "program_autoplan_apply",
	title: "Apply an automatic plan",
	description:
		"Apply a finished autoplan proposal: it renames the affected sessions and REPLACES all their presentation slots. Can only be applied once per job.",
	input: jobIdInput,
	roles: ["ADMIN"],
	scope: MCP_SCOPE_SCHEDULE_WRITE,
	destructive: true,
	async handler({ jobId }) {
		return applyAutoPlan(jobId);
	},
});

export const plannerMcpTools: readonly McpTool[] = [
	getProgram,
	getIssues,
	getUnscheduled,
	roomCreate,
	roomUpdate,
	roomDelete,
	trackCreate,
	trackUpdate,
	trackDelete,
	trackImport,
	sessionCreate,
	sessionUpdate,
	sessionDelete,
	sessionChairAdd,
	sessionChairRemove,
	sessionContinueSeries,
	sessionSplit,
	presentationCreate,
	presentationUpdate,
	presentationDelete,
	presentationReorder,
	badgesSet,
	invitedCreate,
	invitedUpdate,
	breakCreate,
	breakUpdate,
	breakDelete,
	publish,
	autoplanStart,
	autoplanStatus,
	autoplanApply,
];
