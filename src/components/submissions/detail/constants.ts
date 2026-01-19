import type { SubmissionStatus, SubmissionType } from "@/lib/mock-data/submissions";

export const STATUS_GRADIENTS: Record<SubmissionStatus, string> = {
	DRAFT: "from-slate-400 to-slate-500",
	SUBMITTED: "from-blue-400 to-blue-600",
	UNDER_REVIEW: "from-orange-400 to-orange-600",
	REVIEWS_COMPLETE: "from-purple-400 to-purple-600",
	AWAITING_DECISION: "from-purple-400 to-purple-600",
	REVISE_REQUIRED: "from-yellow-400 to-yellow-600",
	RESUBMITTED: "from-blue-400 to-blue-600",
	ACCEPTED: "from-green-400 to-green-600",
	CONDITIONALLY_ACCEPTED: "from-emerald-400 to-emerald-600",
	REJECTED: "from-red-400 to-red-600",
	WITHDRAWN: "from-gray-400 to-gray-500",
};

export const STATUS_LABELS: Record<SubmissionStatus, string> = {
	DRAFT: "Szkic",
	SUBMITTED: "Zgłoszono",
	UNDER_REVIEW: "W recenzji",
	REVIEWS_COMPLETE: "Recenzje zakończone",
	AWAITING_DECISION: "Oczekuje na decyzję",
	REVISE_REQUIRED: "Wymagane poprawki",
	RESUBMITTED: "Ponownie zgłoszono",
	ACCEPTED: "Zaakceptowano",
	CONDITIONALLY_ACCEPTED: "Warunkowo zaakceptowano",
	REJECTED: "Odrzucono",
	WITHDRAWN: "Wycofano",
};

export const TYPE_LABELS: Record<SubmissionType, string> = {
	ABSTRACT: "Abstract",
	FULL_PAPER: "Artykuł",
	POSTER: "Poster",
};
