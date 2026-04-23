export interface ProposedPresentation {
	submissionId: string;
	title: string;
}

export interface ProposedSession {
	sessionId: string;
	originalTitle: string;
	proposedTitle: string;
	roomName: string | null;
	startAt: string;
	endAt: string;
	presentations: ProposedPresentation[];
}

export interface AutoPlanProposal {
	sessions: ProposedSession[];
	stats: {
		submissionCount: number;
		sessionCount: number;
		targetPerSession: number;
		sizeMin: number;
		sizeMax: number;
	};
}
