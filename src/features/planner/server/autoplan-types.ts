import { z } from "zod";

export const AUTOPLAN_STAGES = [
	"loading",
	"embedding",
	"clustering",
	"labeling",
] as const;

export type AutoplanStage = (typeof AUTOPLAN_STAGES)[number];

const ProposedPresentationSchema = z.object({
	submissionId: z.string(),
	title: z.string(),
});

const ProposedSessionSchema = z.object({
	sessionId: z.string(),
	originalTitle: z.string(),
	proposedTitle: z.string(),
	roomName: z.string().nullable(),
	startAt: z.string(),
	endAt: z.string(),
	presentations: z.array(ProposedPresentationSchema),
});

export const AutoPlanProposalSchema = z.object({
	sessions: z.array(ProposedSessionSchema),
	stats: z.object({
		submissionCount: z.number(),
		sessionCount: z.number(),
		targetPerSession: z.number(),
		sizeMin: z.number(),
		sizeMax: z.number(),
	}),
});

export type ProposedPresentation = z.infer<typeof ProposedPresentationSchema>;
export type ProposedSession = z.infer<typeof ProposedSessionSchema>;
export type AutoPlanProposal = z.infer<typeof AutoPlanProposalSchema>;
