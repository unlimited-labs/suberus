import type { Session, User } from "better-auth/types";
import { prisma } from "@/db";
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
