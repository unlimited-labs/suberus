import type {
	PublicProgramBreak,
	PublicProgramSession,
} from "@/features/planner/server/schedule";

export type ProgramItem =
	| { kind: "session"; data: PublicProgramSession }
	| { kind: "break"; data: PublicProgramBreak };

export type TimeGroup = {
	startAt: Date | string;
	endAt: Date | string;
	sessions: PublicProgramSession[];
	breaks: PublicProgramBreak[];
};
