import type { Session, User } from "better-auth/types";
import latinize from "latinize";
import { prisma } from "@/db.server";
import { env } from "@/env";
import type {
	EditorDecisionType,
	SubmissionStatus,
	SubmissionType,
} from "@/generated/prisma/enums";
import { logActivity } from "@/lib/server/activity-log";
import { assignReviewer } from "@/lib/server/assignments";
import { sendEmail } from "@/lib/server/email";
import { getSetting } from "@/lib/server/settings";
import {
	executeSubmissionTransition,
	getCaretakerEditor,
} from "@/lib/server/workflow";
import { SUBMISSION_TYPE_TO_KEY } from "@/lib/settings/types";
import type { CreateSubmissionInput } from "@/lib/validations/submission";
import { logger } from "@/logger.ts";

interface CreateSubmissionResult {
	id: string;
	success: boolean;
}

export interface AuthSession {
	session: Session;
	user: User & { id: string };
}

/** Latinized, lowercased "first last" key for name-based author matching */
function normalizeName(firstName: string, lastName: string): string {
	return `${latinize(firstName)} ${latinize(lastName)}`
		.trim()
		.toLowerCase()
		.replace(/\s+/g, " ");
}

/** Link co-author records to a user account by email (case-insensitive, only where userId is null) */
export async function linkCoAuthorsByEmail(
	email: string,
	userId: string,
): Promise<void> {
	await prisma.submissionAuthor.updateMany({
		where: { email: { equals: email, mode: "insensitive" }, userId: null },
		data: { userId },
	});
}

export async function createNewSubmission(
	data: CreateSubmissionInput,
	userId: string,
	isDraft = false,
): Promise<CreateSubmissionResult> {
	// Create submission in transaction
	const submission = await prisma.$transaction(async (tx) => {
		// Upsert affiliations for authors without affiliationId — dedupe by name
		// and run sequentially to avoid intra-transaction race on the unique
		// constraint when multiple co-authors share an affiliation.
		const uniqueAffiliationNames = Array.from(
			new Set(
				data.authors
					.filter((a) => !a.affiliationId)
					.map((a) => a.affiliationName),
			),
		);
		const affiliationByName = new Map<string, string>();
		for (const name of uniqueAffiliationNames) {
			const affiliation = await tx.affiliation.upsert({
				where: { name },
				update: {},
				create: { name },
			});
			affiliationByName.set(name, affiliation.id);
		}
		const authorAffiliations = data.authors.map((a) => {
			if (a.affiliationId) return a.affiliationId;
			const id = affiliationByName.get(a.affiliationName);
			if (!id) {
				throw new Error(
					`Affiliation upsert missing for "${a.affiliationName}"`,
				);
			}
			return id;
		});

		// Upsert keywords — dedupe + sequential for the same reason
		const uniqueKeywordNames = Array.from(new Set(data.keywords));
		const keywordRecords: Array<{ id: string; name: string }> = [];
		for (const name of uniqueKeywordNames) {
			const keyword = await tx.keyword.upsert({
				where: { name },
				update: {},
				create: { name },
			});
			keywordRecords.push({ id: keyword.id, name: keyword.name });
		}

		// Create submission
		const initialStatus = isDraft ? "DRAFT" : "SUBMITTED";
		const submission = await tx.submission.create({
			data: {
				type: data.type,
				title: data.title,
				content: data.content,
				status: initialStatus,
				userId,
				trackId: data.trackId || null,
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

		// Link co-author records to existing verified users
		const coAuthorEmails = data.authors.map((a) => a.email);
		const matchedUsers = await tx.user.findMany({
			where: {
				email: { in: coAuthorEmails, mode: "insensitive" },
				emailVerified: true,
			},
			select: { id: true, email: true },
		});
		const matchedEmails = new Set(
			matchedUsers.map((u) => u.email.toLowerCase()),
		);
		for (const matchedUser of matchedUsers) {
			await tx.submissionAuthor.updateMany({
				where: {
					submissionId: submission.id,
					email: { equals: matchedUser.email, mode: "insensitive" },
					userId: null,
				},
				data: { userId: matchedUser.id },
			});
		}

		// Fallback: link the submitter's own author row even when they entered a
		// different email than their account. Match by latinized name and ONLY
		// when exactly one still-unlinked author matches (avoid namesakes). Safe
		// because we link to the known submitter id — grants no extra access.
		const submitterAlreadyLinked = matchedUsers.some((u) => u.id === userId);
		if (!submitterAlreadyLinked) {
			const submitter = await tx.user.findUnique({
				where: { id: userId },
				select: { firstName: true, lastName: true },
			});
			const target = normalizeName(
				submitter?.firstName ?? "",
				submitter?.lastName ?? "",
			);
			if (target) {
				const candidates = authors.filter(
					(a) =>
						!matchedEmails.has(a.email.toLowerCase()) &&
						normalizeName(a.firstName, a.lastName) === target,
				);
				if (candidates.length === 1) {
					await tx.submissionAuthor.update({
						where: { id: candidates[0].id },
						data: { userId },
					});
				}
			}
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

		// Create activity log entry
		await tx.activityLog.create({
			data: {
				type: "SUBMISSION_CREATED",
				submissionId: submission.id,
				performedBy: userId,
				detail: {
					type: "SUBMISSION_CREATED",
					title: data.title,
					submissionType: data.type,
					isDraft,
				},
			},
		});

		return submission;
	});

	// Send confirmation email only for submitted (not draft)
	if (!isDraft) {
		const presenter = data.authors.find((a) => a.isPresenter);
		if (presenter) {
			void sendEmail("SUBMISSION_RECEIVED", presenter.email, {
				authorName: `${presenter.firstName} ${presenter.lastName}`,
				submissionTitle: data.title,
				submissionUrl: `${env.APP_BASE_URL}/submissions/${submission.id}`,
			});
		}
		// Notify admin about new submission
		const contactEmail = await getSetting("CONTACT_EMAIL");
		if (contactEmail) {
			const allAuthors = data.authors
				.map((a) => `${a.firstName} ${a.lastName}`)
				.join(", ");
			void sendEmail("NEW_SUBMISSION_NOTIFY", contactEmail, {
				submissionTitle: data.title,
				authors: allAuthors,
				submissionUrl: `${env.APP_BASE_URL}/admin/submissions/${submission.id}`,
			});
		}
	}

	logger.info(
		`[submission] created ${submission.id} type=${data.type}${isDraft ? " (draft)" : ""}`,
	);

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
	role: "author" | "coauthor";
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
	scores: Record<string, number> | null;
	comments: string | null;
	attachment: {
		id: string;
		fileName: string;
		originalName: string;
		size: number;
	} | null;
	createdAt: Date;
}

export interface UserSubmissionDecision {
	id: string;
	submissionId: string;
	decision: EditorDecisionType;
	reasoning: string | null;
	letterToAuthor: string | null;
	revisionsRequired?: string[];
	conditions?: string[];
	createdAt: Date;
}

export interface UserSubmissionFile {
	id: string;
	fileName: string;
	originalName: string;
	mimeType: string;
	size: number;
}

export interface UserSubmissionVersion {
	id: string;
	submissionId: string;
	version: number;
	title: string;
	content: string;
	comment: string | null;
	authors: UserSubmissionAuthor[];
	keywords: string[];
	file: UserSubmissionFile | null;
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

/** Where clause for submissions accessible by a user (owned or co-authored) */
function userAccessFilter(userId: string) {
	return { OR: [{ userId }, { authors: { some: { userId } } }] };
}

/** Get user's submissions list (owned + co-authored) */
export async function getSubmissionsForUser(
	userId: string,
): Promise<UserSubmission[]> {
	const submissions = await prisma.submission.findMany({
		where: userAccessFilter(userId),
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
		role: s.userId === userId ? ("author" as const) : ("coauthor" as const),
	}));
}

/** Get single submission with all details for owner or co-author */
export async function getSubmissionById(
	submissionId: string,
	userId: string,
): Promise<SubmissionDetail | null> {
	console.log("[DEBUG] getSubmissionById called:", submissionId, userId);
	try {
		const submission = await prisma.submission.findFirst({
			where: { id: submissionId, ...userAccessFilter(userId) },
			include: {
				currentVersion: true,
				authors: {
					include: { affiliation: true },
					orderBy: { orderIndex: "asc" },
				},
				keywords: {
					include: { keyword: true },
				},
				activityLog: {
					where: {
						type: {
							in: [
								"SUBMISSION_CREATED",
								"SUBMISSION_DRAFT_SUBMITTED",
								"SUBMISSION_STATUS_CHANGED",
								"SUBMISSION_WITHDRAWN",
								"SUBMISSION_RESUBMITTED",
							],
						},
					},
					include: {
						performer: { select: { firstName: true, lastName: true } },
					},
					orderBy: { createdAt: "asc" },
				},
				reviews: {
					include: {
						reviewer: {
							select: { firstName: true, lastName: true },
						},
					},
					orderBy: { createdAt: "desc" },
				},
				editorDecisions: {
					orderBy: { createdAt: "desc" },
					take: 1,
				},
				versions: {
					include: {
						file: {
							select: {
								id: true,
								fileName: true,
								originalName: true,
								mimeType: true,
								size: true,
							},
						},
						submission: {
							include: {
								authors: {
									include: { affiliation: true },
									orderBy: { orderIndex: "asc" },
								},
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

		const statusHistory: UserSubmissionStatusHistory[] =
			submission.activityLog.map((h) => {
				const detail = h.detail as Record<string, unknown> | null;

				let status: SubmissionStatus;
				switch (h.type) {
					case "SUBMISSION_CREATED":
						status = detail?.isDraft ? "DRAFT" : "SUBMITTED";
						break;
					case "SUBMISSION_DRAFT_SUBMITTED":
						status = "SUBMITTED";
						break;
					case "SUBMISSION_RESUBMITTED":
						status = "RESUBMITTED";
						break;
					case "SUBMISSION_WITHDRAWN":
						status = "WITHDRAWN";
						break;
					default:
						status = (detail?.toStatus as SubmissionStatus) ?? "SUBMITTED";
				}

				return {
					id: h.id,
					submissionId: h.submissionId ?? "",
					status,
					timestamp: h.createdAt,
					triggeredBy: h.performer
						? `${h.performer.firstName ?? ""} ${h.performer.lastName ?? ""}`.trim() ||
							"System"
						: "System",
					metadata: detail as { reason?: string; comment?: string } | undefined,
				};
			});

		// In OPEN mode, authors can see reviewer identities (WORKFLOW.md)
		const configKey = SUBMISSION_TYPE_TO_KEY[submission.type];
		const config = await getSetting(configKey);
		const isOpenReview = config.reviewMode === "OPEN";

		// Hide current-round reviews during active review phase — authors see reviews only after decision
		const activeReviewStatuses: SubmissionStatus[] = [
			"UNDER_REVIEW",
			"REVIEWS_COMPLETE",
			"AWAITING_DECISION",
		];
		const hideCurrentRound = activeReviewStatuses.includes(submission.status);

		const visibleReviews = submission.reviews.filter(
			(r) => !hideCurrentRound || r.round < submission.currentRound,
		);

		// Load attachments for visible reviews
		const visibleReviewIds = visibleReviews.map((r) => r.id);
		const reviewAttachments =
			visibleReviewIds.length > 0
				? await prisma.file.findMany({
						where: {
							entityType: "REVIEW",
							entityId: { in: visibleReviewIds },
							type: "REVIEW_ATTACHMENT",
						},
						select: {
							id: true,
							entityId: true,
							fileName: true,
							originalName: true,
							size: true,
						},
					})
				: [];
		const attachmentByReviewId = new Map(
			reviewAttachments.map((a) => [a.entityId, a]),
		);

		const reviews: UserSubmissionReview[] = visibleReviews.map((r, index) => {
			const att = attachmentByReviewId.get(r.id);
			return {
				id: r.id,
				submissionId: r.submissionId,
				round: r.round,
				reviewerName: isOpenReview
					? `${r.reviewer.firstName ?? ""} ${r.reviewer.lastName ?? ""}`.trim() ||
						`Reviewer ${index + 1}`
					: `Reviewer ${index + 1}`,
				scores: config.enableScoring
					? ((r.scores as Record<string, number>) ?? null)
					: null,
				comments: r.comments,
				attachment: att
					? {
							id: att.id,
							fileName: att.fileName,
							originalName: att.originalName,
							size: att.size,
						}
					: null,
				createdAt: r.createdAt,
			};
		});

		const latestDecision = submission.editorDecisions[0];
		const decision: UserSubmissionDecision | null = latestDecision
			? {
					id: latestDecision.id,
					submissionId: latestDecision.submissionId,
					decision: latestDecision.decision,
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
			comment: v.comment,
			authors, // All versions share same author structure for simplicity
			keywords,
			file: v.file
				? {
						id: v.file.id,
						fileName: v.file.fileName,
						originalName: v.file.originalName,
						mimeType: v.file.mimeType,
						size: v.file.size,
					}
				: null,
			createdAt: v.createdAt,
		}));

		console.log("[DEBUG] getSubmissionById returning data for:", submissionId);
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
				role: submission.userId === userId ? "author" : "coauthor",
			},
			statusHistory,
			reviews,
			decision,
			versions,
		};
	} catch (err) {
		console.error("[DEBUG] getSubmissionById ERROR:", err);
		throw err;
	}
}

export interface ResubmitSubmissionInput {
	title: string;
	content: string;
	comment?: string;
}

/** Resubmit a submission (creates new version, transitions REVISE_REQUIRED → RESUBMITTED) */
export async function resubmitSubmission(
	submissionId: string,
	userId: string,
	data: ResubmitSubmissionInput,
): Promise<{ success: boolean; versionNumber: number; error?: string }> {
	const submission = await prisma.submission.findFirst({
		where: { id: submissionId, userId },
		include: { currentVersion: true },
	});

	if (!submission) {
		return { success: false, versionNumber: 0, error: "Submission not found" };
	}

	const nextVersion = (submission.currentVersion?.version ?? 0) + 1;
	const nextRound = submission.currentRound + 1;

	// Atomic: lock row, verify status, create version, update status
	const version = await prisma.$transaction(async (tx) => {
		// Row lock prevents concurrent resubmissions (TOCTOU)
		const [locked] = await tx.$queryRawUnsafe<Array<{ status: string }>>(
			'SELECT "status" FROM "submissions" WHERE "id" = $1 FOR UPDATE',
			submissionId,
		);
		if (locked?.status !== "REVISE_REQUIRED") {
			return null;
		}

		const version = await tx.submissionVersion.create({
			data: {
				submissionId,
				version: nextVersion,
				title: data.title,
				content: data.content,
				comment: data.comment,
			},
		});

		await tx.submission.update({
			where: { id: submissionId },
			data: {
				status: "RESUBMITTED",
				currentRound: nextRound,
				title: data.title,
				content: data.content,
				currentVersionId: version.id,
			},
		});

		await tx.activityLog.create({
			data: {
				type: "SUBMISSION_RESUBMITTED",
				submissionId,
				performedBy: userId,
				detail: {
					type: "SUBMISSION_RESUBMITTED",
					fromStatus: "REVISE_REQUIRED",
					toStatus: "RESUBMITTED",
					round: nextRound,
					event: "RESUBMIT",
					reason: data.comment || "Author resubmitted revised version",
				},
			},
		});

		return version;
	});

	if (!version) {
		return {
			success: false,
			versionNumber: 0,
			error: "Submission is not in REVISE_REQUIRED status",
		};
	}

	// Auto-reassign reviewers from previous round
	const previousAssignments = await prisma.reviewAssignment.findMany({
		where: {
			submissionId,
			round: submission.currentRound, // previous round (before increment)
			status: { notIn: ["CANCELLED"] },
		},
		select: { reviewerId: true, assignedBy: true },
	});

	for (const prev of previousAssignments) {
		if (!prev.assignedBy) continue;
		await assignReviewer(submissionId, prev.reviewerId, prev.assignedBy);
	}

	// Notify caretaker editor about the revision
	const caretaker = await getCaretakerEditor(submissionId);
	if (caretaker) {
		const presenter = await prisma.submissionAuthor.findFirst({
			where: { submissionId, isPresenter: true },
		});

		void sendEmail("REVISION_RECEIVED", caretaker.email, {
			submissionTitle: data.title,
			authorName: presenter
				? `${presenter.firstName} ${presenter.lastName}`
				: "Author",
			versionNumber: String(version.version),
			submissionUrl: `${env.APP_BASE_URL}/admin/submissions/${submissionId}`,
		});
	}

	logger.info(`[submission] resubmitted ${submissionId} v${version.version}`);

	return { success: true, versionNumber: version.version };
}

/** Update a draft submission (DRAFT or SUBMITTED status) */
export async function updateDraftSubmission(
	submissionId: string,
	userId: string,
	data: CreateSubmissionInput,
): Promise<{ success: boolean; error?: string }> {
	const submission = await prisma.submission.findFirst({
		where: { id: submissionId, userId },
		include: { currentVersion: true },
	});

	if (!submission) {
		return { success: false, error: "Submission not found" };
	}

	if (submission.status !== "DRAFT") {
		return {
			success: false,
			error: "Can only edit submissions in DRAFT status",
		};
	}

	await prisma.$transaction(async (tx) => {
		// Upsert affiliations
		const authorAffiliations = await Promise.all(
			data.authors.map(async (author) => {
				if (author.affiliationId) return author.affiliationId;
				const affiliation = await tx.affiliation.upsert({
					where: { name: author.affiliationName },
					update: {},
					create: { name: author.affiliationName },
				});
				return affiliation.id;
			}),
		);

		// Update submission core fields
		await tx.submission.update({
			where: { id: submissionId },
			data: {
				type: data.type,
				title: data.title,
				content: data.content,
				trackId: data.trackId || null,
			},
		});

		// Update version
		if (submission.currentVersion) {
			await tx.submissionVersion.update({
				where: { id: submission.currentVersion.id },
				data: { title: data.title, content: data.content },
			});
		}

		// Clear presenter reference before deleting authors (FK constraint)
		await tx.submission.update({
			where: { id: submissionId },
			data: { presenterId: null },
		});

		// Replace authors: delete old, create new
		await tx.submissionAuthor.deleteMany({
			where: { submissionId },
		});

		const authors = await Promise.all(
			data.authors.map(async (author, index) => {
				return tx.submissionAuthor.create({
					data: {
						submissionId,
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
				where: { id: submissionId },
				data: { presenterId: presenter.id },
			});
		}

		// Link co-authors to existing users
		const coAuthorEmails = data.authors.map((a) => a.email);
		const matchedUsers = await tx.user.findMany({
			where: {
				email: { in: coAuthorEmails, mode: "insensitive" },
				emailVerified: true,
			},
			select: { id: true, email: true },
		});
		for (const matchedUser of matchedUsers) {
			await tx.submissionAuthor.updateMany({
				where: {
					submissionId,
					email: { equals: matchedUser.email, mode: "insensitive" },
					userId: null,
				},
				data: { userId: matchedUser.id },
			});
		}

		// Replace keywords
		await tx.submissionKeyword.deleteMany({ where: { submissionId } });

		const keywordRecords = await Promise.all(
			data.keywords.map(async (keyword) => {
				return tx.keyword.upsert({
					where: { name: keyword },
					update: {},
					create: { name: keyword },
				});
			}),
		);

		await Promise.all(
			keywordRecords.map(async (keyword) => {
				return tx.submissionKeyword.create({
					data: { submissionId, keywordId: keyword.id },
				});
			}),
		);
	});

	logger.info(`[submission] updated draft ${submissionId}`);

	return { success: true };
}

/** Submit a draft (transition DRAFT → SUBMITTED) */
export async function submitDraft(
	submissionId: string,
	userId: string,
): Promise<{ success: boolean; error?: string }> {
	const submission = await prisma.submission.findFirst({
		where: { id: submissionId, userId },
	});

	if (!submission) {
		return { success: false, error: "Submission not found" };
	}

	if (submission.status !== "DRAFT") {
		return { success: false, error: "Submission is not a draft" };
	}

	const result = await executeSubmissionTransition(
		submissionId,
		{ type: "SUBMIT" },
		userId,
		"Author submitted draft",
	);

	if (!result.success) {
		return { success: false, error: result.error ?? "Failed to submit draft" };
	}

	await logActivity({
		type: "SUBMISSION_DRAFT_SUBMITTED",
		submissionId,
		performedBy: userId,
	});

	logger.info(`[submission] submitted draft ${submissionId}`);

	// Send confirmation email
	const presenter = await prisma.submissionAuthor.findFirst({
		where: { submissionId, isPresenter: true },
	});
	if (presenter) {
		void sendEmail("SUBMISSION_RECEIVED", presenter.email, {
			authorName: `${presenter.firstName} ${presenter.lastName}`,
			submissionTitle: submission.title,
			submissionUrl: `${env.APP_BASE_URL}/submissions/${submissionId}`,
		});
	}

	// Notify admin about new submission
	const contactEmail = await getSetting("CONTACT_EMAIL");
	if (contactEmail) {
		const allAuthors = await prisma.submissionAuthor.findMany({
			where: { submissionId },
			orderBy: { orderIndex: "asc" },
			select: { firstName: true, lastName: true },
		});
		const authorsStr = allAuthors
			.map((a) => `${a.firstName} ${a.lastName}`)
			.join(", ");
		void sendEmail("NEW_SUBMISSION_NOTIFY", contactEmail, {
			submissionTitle: submission.title,
			authors: authorsStr,
			submissionUrl: `${env.APP_BASE_URL}/admin/submissions/${submissionId}`,
		});
	}

	return { success: true };
}
