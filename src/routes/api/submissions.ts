import { createFileRoute } from "@tanstack/react-router";
import { prisma } from "@/db";
import { sendEmail } from "@/lib/server/email";
import { createSubmissionSchema } from "@/lib/validations/submission";
import { auth } from "../../../auth";

export const Route = createFileRoute("/api/submissions")({
	server: {
		handlers: {
			POST: async ({ request }: { request: Request }) => {
				// Get session
				const session = await auth.api.getSession({
					headers: request.headers,
				});

				if (!session?.user) {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				// Parse and validate body
				let body: unknown;
				try {
					body = await request.json();
				} catch {
					return new Response(JSON.stringify({ error: "Invalid JSON" }), {
						status: 400,
						headers: { "Content-Type": "application/json" },
					});
				}

				const result = createSubmissionSchema.safeParse(body);
				if (!result.success) {
					return new Response(
						JSON.stringify({
							error: "Validation failed",
							issues: result.error.issues,
						}),
						{ status: 400, headers: { "Content-Type": "application/json" } },
					);
				}

				const data = result.data;

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
							userId: session.user.id,
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
							triggeredBy: session.user.id,
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

				return new Response(
					JSON.stringify({ id: submission.id, success: true }),
					{ status: 201, headers: { "Content-Type": "application/json" } },
				);
			},
		},
	},
});
