import type { Session, User } from "better-auth/types";
import { prisma } from "@/db";
import type {
	SubmissionStatus,
	SubmissionType,
} from "@/generated/prisma/enums";
import { sendEmail } from "@/lib/server/email";
import type { CreateSubmissionInput } from "@/lib/validations/submission";

interface CreateSubmissionResult {
	id: string;
	success: boolean;
}

export interface AuthSession {
	session: Session;
	user: User & { id: string };
}

export async function createNewSubmission(
	data: CreateSubmissionInput,
	userId: string,
): Promise<CreateSubmissionResult> {
	// Create submission in transaction
	const submission = await prisma.$transaction(async (tx) => {
		// Upsert affiliations for authors without affiliationId
		const authorAffiliations = await Promise.all(
			data.authors.map(async (author) => {
				if (author.affiliationId) {
					return author.affiliationId;
				}
				const affiliation = await tx.affiliation.upsert({
					where: { name: author.affiliationName },
					update: {},
					create: { name: author.affiliationName },
				});
				return affiliation.id;
			}),
		);

		// Upsert keywords
		const keywordRecords = await Promise.all(
			data.keywords.map(async (keyword) => {
				return tx.keyword.upsert({
					where: { name: keyword },
					update: {},
					create: { name: keyword },
				});
			}),
		);

		// Create submission
		const submission = await tx.submission.create({
			data: {
				type: data.type,
				title: data.title,
				content: data.content,
				status: "SUBMITTED",
				userId,
			},
		});

		// Create submission version
		const version = await tx.submissionVersion.create({
			data: {
				submissionId: submission.id,
				version: 1,
				title: data.title,
				content: data.content,
			},
		});

		// Update submission with current version
		await tx.submission.update({
			where: { id: submission.id },
			data: { currentVersionId: version.id },
		});

		// Create submission authors
		const authors = await Promise.all(
			data.authors.map(async (author, index) => {
				return tx.submissionAuthor.create({
					data: {
						submissionId: submission.id,
						firstName: author.firstName,
						lastName: author.lastName,
						email: author.email,
						affiliationId: authorAffiliations[index],
						orderIndex: index,
						isPresenter: author.isPresenter,
					},
				});
			}),
		);

		// Update presenter reference
		const presenter = authors.find((a) => a.isPresenter);
		if (presenter) {
			await tx.submission.update({
				where: { id: submission.id },
				data: { presenterId: presenter.id },
			});
		}

		// Create submission keywords
		await Promise.all(
			keywordRecords.map(async (keyword) => {
				return tx.submissionKeyword.create({
					data: {
						submissionId: submission.id,
						keywordId: keyword.id,
					},
				});
			}),
		);

		// Create status history
		await tx.submissionStatusHistory.create({
			data: {
				submissionId: submission.id,
				fromStatus: null,
				toStatus: "SUBMITTED",
				event: "submission_created",
				triggeredBy: userId,
			},
		});

		return submission;
	});

	// Send confirmation email (non-blocking, errors handled internally)
	const presenter = data.authors.find((a) => a.isPresenter);
	if (presenter) {
		void sendEmail("SUBMISSION_RECEIVED", presenter.email, {
			authorName: `${presenter.firstName} ${presenter.lastName}`,
			submissionTitle: data.title,
			submissionId: submission.id,
		});
	}

	return { id: submission.id, success: true };
}

// Types for user submission views
export interface UserSubmission {
	id: string;
	title: string;
	type: SubmissionType;
	status: SubmissionStatus;
	currentRound: number;
	currentVersion: number;
	createdAt: Date;
	updatedAt: Date;
}

export interface UserSubmissionAuthor {
	firstName: string;
	lastName: string;
	email: string;
	affiliation: string;
	isPresenter: boolean;
}

export interface UserSubmissionStatusHistory {
	id: string;
	submissionId: string;
	status: SubmissionStatus;
	timestamp: Date;
	triggeredBy: string;
	metadata?: { reason?: string; comment?: string };
}

export interface UserSubmissionReview {
	id: string;
	submissionId: string;
	round: number;
	reviewerName: string;
	scores: {
		originality: number | null;
		clarity: number | null;
		significance: number | null;
		overall: number | null;
	};
	comments: string | null;
	createdAt: Date;
}

export interface UserSubmissionDecision {
	id: string;
	submissionId: string;
	decision: SubmissionStatus;
	reasoning: string | null;
	letterToAuthor: string | null;
	revisionsRequired?: string[];
	conditions?: string[];
	createdAt: Date;
}

export interface UserSubmissionVersion {
	id: string;
	submissionId: string;
	version: number;
	title: string;
	content: string;
	authors: UserSubmissionAuthor[];
	keywords: string[];
	createdAt: Date;
}

export interface SubmissionDetail {
	submission: UserSubmission & {
		content: string;
		authors: UserSubmissionAuthor[];
		keywords: string[];
	};
	statusHistory: UserSubmissionStatusHistory[];
	reviews: UserSubmissionReview[];
	decision: UserSubmissionDecision | null;
	versions: UserSubmissionVersion[];
}

/** Get user's submissions list */
export async function getSubmissionsForUser(
	userId: string,
): Promise<UserSubmission[]> {
	const submissions = await prisma.submission.findMany({
		where: { userId },
		include: {
			currentVersion: { select: { version: true } },
		},
		orderBy: { updatedAt: "desc" },
	});

	return submissions.map((s) => ({
		id: s.id,
		title: s.title,
		type: s.type,
		status: s.status,
		currentRound: s.currentRound,
		currentVersion: s.currentVersion?.version ?? 1,
		createdAt: s.createdAt,
		updatedAt: s.updatedAt,
	}));
}

/** Get single submission with all details for owner */
export async function getSubmissionById(
	submissionId: string,
	userId: string,
): Promise<SubmissionDetail | null> {
	const submission = await prisma.submission.findFirst({
		where: { id: submissionId, userId },
		include: {
			currentVersion: true,
			authors: {
				include: { affiliation: true },
				orderBy: { orderIndex: "asc" },
			},
			keywords: {
				include: { keyword: true },
			},
			statusHistory: {
				include: { triggeredByUser: true },
				orderBy: { createdAt: "asc" },
			},
			reviews: {
				orderBy: { createdAt: "desc" },
			},
			editorDecisions: {
				orderBy: { createdAt: "desc" },
				take: 1,
			},
			versions: {
				include: {
					submission: {
						include: {
							authors: { include: { affiliation: true }, orderBy: { orderIndex: "asc" } },
							keywords: { include: { keyword: true } },
						},
					},
				},
				orderBy: { version: "asc" },
			},
		},
	});

	if (!submission) return null;

	const authors: UserSubmissionAuthor[] = submission.authors.map((a) => ({
		firstName: a.firstName,
		lastName: a.lastName,
		email: a.email,
		affiliation: a.affiliation?.name ?? "",
		isPresenter: a.isPresenter,
	}));

	const keywords = submission.keywords.map((k) => k.keyword.name);

	const statusHistory: UserSubmissionStatusHistory[] = submission.statusHistory.map((h) => ({
		id: h.id,
		submissionId: h.submissionId,
		status: h.toStatus,
		timestamp: h.createdAt,
		triggeredBy: h.triggeredByUser
			? `${h.triggeredByUser.firstName ?? ""} ${h.triggeredByUser.lastName ?? ""}`.trim() ||
			  "System"
			: "System",
		metadata: h.metadata as { reason?: string; comment?: string } | undefined,
	}));

	// Reviews are anonymized for authors (just "Reviewer 1", "Reviewer 2", etc.)
	const reviews: UserSubmissionReview[] = submission.reviews.map((r, index) => ({
		id: r.id,
		submissionId: r.submissionId,
		round: r.round,
		reviewerName: `Reviewer ${index + 1}`,
		scores: {
			originality: r.scoreNovelty,
			clarity: r.scoreClarity,
			significance: r.scoreRelevance,
			overall: r.scoreMethodology, // Map overall to methodology for now
		},
		comments: r.comments,
		createdAt: r.createdAt,
	}));

	const latestDecision = submission.editorDecisions[0];
	const decision: UserSubmissionDecision | null = latestDecision
		? {
				id: latestDecision.id,
				submissionId: latestDecision.submissionId,
				decision: latestDecision.decision as unknown as SubmissionStatus,
				reasoning: latestDecision.reasoning,
				letterToAuthor: latestDecision.letterToAuthor,
				createdAt: latestDecision.createdAt,
			}
		: null;

	const versions: UserSubmissionVersion[] = submission.versions.map((v) => ({
		id: v.id,
		submissionId: v.submissionId,
		version: v.version,
		title: v.title,
		content: v.content,
		authors, // All versions share same author structure for simplicity
		keywords,
		createdAt: v.createdAt,
	}));

	return {
		submission: {
			id: submission.id,
			title: submission.currentVersion?.title ?? submission.title,
			type: submission.type,
			status: submission.status,
			currentRound: submission.currentRound,
			currentVersion: submission.currentVersion?.version ?? 1,
			createdAt: submission.createdAt,
			updatedAt: submission.updatedAt,
			content: submission.currentVersion?.content ?? submission.content,
			authors,
			keywords,
		},
		statusHistory,
		reviews,
		decision,
		versions,
	};
}
