import { env } from "@/env";
import {
	logActivity,
	logActivityTx,
} from "@/features/activity-log/server/activity-log";
import { activityDetail } from "@/features/activity-log/types";
import {
	getSetting,
	getSubmissionTypeConfigs,
} from "@/features/settings/server/settings";
import {
	deskAcceptSubmission,
	deskRejectSubmission,
	validateSubmissionTransition,
	withdrawSubmission,
} from "@/features/workflow/server/workflow";
import type {
	ExhibitorApplicationInput,
	ExhibitorPresentationInput,
} from "@/lib/validations/exhibitor";
import { prisma } from "@/shared/server/db.server";
import { sendEmail } from "@/shared/server/email";

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export async function isExhibitorSignupAvailable(): Promise<boolean> {
	const configs = await getSubmissionTypeConfigs();
	return configs.EXHIBITOR.isActive;
}

/** Self-service signup: AUTHOR with no exhibitor row and no submissions becomes EXHIBITOR */
export async function becomeExhibitor(userId: string): Promise<void> {
	if (!(await isExhibitorSignupAvailable())) {
		throw new Error("Exhibitor signup is not available");
	}

	const user = await prisma.user.findUniqueOrThrow({
		where: { id: userId },
		select: {
			role: true,
			exhibitor: { select: { id: true } },
			_count: { select: { submissions: true } },
		},
	});

	if (user.role !== "AUTHOR") {
		throw new Error("Only authors can become exhibitors");
	}
	if (user.exhibitor) {
		throw new Error("Exhibitor profile already exists");
	}
	if (user._count.submissions > 0) {
		throw new Error("Users with existing submissions cannot become exhibitors");
	}

	await prisma.$transaction([
		prisma.user.update({ where: { id: userId }, data: { role: "EXHIBITOR" } }),
		prisma.exhibitor.create({ data: { userId } }),
	]);
}

export async function getOwnExhibitor(userId: string) {
	return prisma.exhibitor.findUnique({
		where: { userId },
		include: {
			submission: {
				select: {
					id: true,
					title: true,
					content: true,
					status: true,
					authors: { orderBy: { orderIndex: "asc" } },
				},
			},
		},
	});
}

/** Create SubmissionAuthor rows (with affiliation upsert) and set presenter reference */
async function createSubmissionAuthors(
	tx: Tx,
	submissionId: string,
	authors: ExhibitorPresentationInput["authors"],
): Promise<void> {
	// Sequential affiliation upserts avoid intra-transaction race on the unique constraint
	const affiliationIds: string[] = [];
	for (const author of authors) {
		if (author.affiliationId) {
			affiliationIds.push(author.affiliationId);
			continue;
		}
		const affiliation = await tx.affiliation.upsert({
			where: { name: author.affiliationName },
			update: {},
			create: { name: author.affiliationName },
		});
		affiliationIds.push(affiliation.id);
	}

	const created = await Promise.all(
		authors.map((author, index) =>
			tx.submissionAuthor.create({
				data: {
					submissionId,
					firstName: author.firstName,
					lastName: author.lastName,
					email: author.email,
					affiliationId: affiliationIds[index],
					orderIndex: index,
					isPresenter: author.isPresenter,
				},
			}),
		),
	);

	const presenter = created.find((a) => a.isPresenter);
	await tx.submission.update({
		where: { id: submissionId },
		data: { presenterId: presenter?.id ?? null },
	});
}

async function createPresentationSubmission(
	tx: Tx,
	userId: string,
	presentation: ExhibitorPresentationInput,
): Promise<string> {
	const submission = await tx.submission.create({
		data: {
			type: "EXHIBITOR",
			title: presentation.title,
			content: presentation.content,
			status: "SUBMITTED",
			userId,
		},
	});

	const version = await tx.submissionVersion.create({
		data: {
			submissionId: submission.id,
			version: 1,
			title: presentation.title,
			content: presentation.content,
		},
	});

	await tx.submission.update({
		where: { id: submission.id },
		data: { currentVersionId: version.id },
	});

	await createSubmissionAuthors(tx, submission.id, presentation.authors);

	return submission.id;
}

async function updatePresentationSubmission(
	tx: Tx,
	submissionId: string,
	presentation: ExhibitorPresentationInput,
): Promise<void> {
	await tx.submission.update({
		where: { id: submissionId },
		data: { title: presentation.title, content: presentation.content },
	});

	await tx.submissionVersion.updateMany({
		where: { submissionId, version: 1 },
		data: { title: presentation.title, content: presentation.content },
	});

	// Clear presenter reference before deleting authors (FK constraint)
	await tx.submission.update({
		where: { id: submissionId },
		data: { presenterId: null },
	});
	await tx.submissionAuthor.deleteMany({ where: { submissionId } });

	await createSubmissionAuthors(tx, submissionId, presentation.authors);
}

/** Save (or complete) the exhibitor application; editable only while PENDING and undecided */
export async function saveExhibitorApplication(
	userId: string,
	data: ExhibitorApplicationInput,
): Promise<void> {
	const exhibitor = await prisma.exhibitor.findUnique({ where: { userId } });
	if (!exhibitor) {
		throw new Error("Exhibitor profile not found");
	}
	if (exhibitor.status !== "PENDING" || exhibitor.decidedAt) {
		throw new Error("Application is locked after a decision");
	}

	const configs = await getSubmissionTypeConfigs();
	const presentation = configs.EXHIBITOR.allowExhibitorPresentation
		? data.presentation
		: undefined;

	const isFirstApply = !exhibitor.appliedAt;

	// Validate WITHDRAW transition before entering the transaction (pre-decision removal path)
	let removedSubmissionRound: number | null = null;
	if (!presentation && exhibitor.submissionId) {
		const withdrawValidation = await validateSubmissionTransition(
			exhibitor.submissionId,
			{ type: "WITHDRAW" },
		);
		if (!withdrawValidation.valid) {
			throw new Error(
				withdrawValidation.error ?? "Cannot withdraw linked presentation",
			);
		}
		const removedSubmission = await prisma.submission.findUniqueOrThrow({
			where: { id: exhibitor.submissionId },
			select: { currentRound: true },
		});
		removedSubmissionRound = removedSubmission.currentRound;
	}

	const createdSubmissionId = await prisma.$transaction(async (tx) => {
		let submissionId = exhibitor.submissionId;
		let created: string | null = null;

		if (presentation) {
			if (submissionId) {
				await updatePresentationSubmission(tx, submissionId, presentation);
			} else {
				submissionId = await createPresentationSubmission(
					tx,
					userId,
					presentation,
				);
				created = submissionId;
			}
		} else if (submissionId) {
			// Presentation removed in a pre-decision edit: withdraw the orphaned submission
			await tx.submission.update({
				where: { id: submissionId },
				data: { status: "WITHDRAWN" },
			});
			await tx.activityLog.create({
				data: {
					type: "SUBMISSION_STATUS_CHANGED",
					submissionId,
					performedBy: userId,
					detail: {
						type: "SUBMISSION_STATUS_CHANGED",
						fromStatus: "SUBMITTED",
						toStatus: "WITHDRAWN",
						round: removedSubmissionRound,
						event: "WITHDRAW",
						reason: "Presentation removed by exhibitor",
					},
				},
			});
			submissionId = null;
		}

		await tx.exhibitor.update({
			where: { id: exhibitor.id },
			data: {
				companyName: data.companyName,
				description: data.description ?? null,
				website: data.website || null,
				submissionId,
				appliedAt: exhibitor.appliedAt ?? new Date(),
			},
		});

		if (isFirstApply) {
			await logActivityTx(tx, {
				type: "EXHIBITOR_APPLIED",
				userId,
				performedBy: userId,
				submissionId: submissionId ?? undefined,
				detail: activityDetail("EXHIBITOR_APPLIED", {
					companyName: data.companyName,
					hasPresentation: Boolean(presentation),
				}),
			});
		}

		return created;
	});

	// Notify admin about the new presentation submission (create path only)
	if (createdSubmissionId && presentation) {
		const contactEmail = await getSetting("CONTACT_EMAIL");
		if (contactEmail) {
			const allAuthors = presentation.authors
				.map((a) => `${a.firstName} ${a.lastName}`)
				.join(", ");
			void sendEmail("NEW_SUBMISSION_NOTIFY", contactEmail, {
				submissionTitle: presentation.title,
				authors: allAuthors,
				submissionUrl: `${env.APP_BASE_URL}/admin/submissions/${createdSubmissionId}`,
			});
		}
	}
}

/** Withdraw own application (PENDING only); withdraws the linked presentation via workflow */
export async function withdrawOwnExhibitor(userId: string): Promise<void> {
	const exhibitor = await prisma.exhibitor.findUniqueOrThrow({
		where: { userId },
	});
	if (exhibitor.status !== "PENDING") {
		throw new Error("Only pending applications can be withdrawn");
	}

	if (exhibitor.submissionId) {
		const result = await withdrawSubmission(
			exhibitor.submissionId,
			userId,
			"Exhibitor withdrew application",
		);
		if (!result.success) {
			throw new Error(result.error ?? "Failed to withdraw presentation");
		}
	}

	await prisma.exhibitor.update({
		where: { id: exhibitor.id },
		data: { status: "WITHDRAWN" },
	});

	await logActivity({
		type: "EXHIBITOR_WITHDRAWN",
		userId,
		performedBy: userId,
		detail: activityDetail("EXHIBITOR_WITHDRAWN"),
	});
}

export async function listExhibitors() {
	return prisma.exhibitor.findMany({
		include: {
			user: {
				select: {
					id: true,
					email: true,
					firstName: true,
					lastName: true,
					fee: true,
				},
			},
			submission: { select: { id: true, title: true, status: true } },
		},
		orderBy: { createdAt: "desc" },
	});
}

export async function getExhibitorDetail(id: string) {
	return prisma.exhibitor.findUnique({
		where: { id },
		include: {
			user: {
				select: {
					id: true,
					email: true,
					firstName: true,
					lastName: true,
					fee: true,
				},
			},
			submission: {
				select: {
					id: true,
					title: true,
					content: true,
					status: true,
					authors: { orderBy: { orderIndex: "asc" } },
				},
			},
			decidedBy: { select: { firstName: true, lastName: true } },
		},
	});
}

/** Admin-declared package (agreed with the exhibitor); editable regardless of status */
export async function setExhibitorPackage(
	id: string,
	value: string | null,
): Promise<void> {
	const trimmed = value?.trim() || null;
	await prisma.exhibitor.update({
		where: { id },
		data: { package: trimmed },
	});
}

/** Admin decision; desk-accepts/rejects the linked presentation through the workflow */
export async function decideExhibitor(
	id: string,
	decision: "APPROVED" | "REJECTED",
	reason: string,
	adminUserId: string,
): Promise<void> {
	const exhibitor = await prisma.exhibitor.findUniqueOrThrow({
		where: { id },
		include: { user: { select: { email: true, firstName: true } } },
	});

	if (exhibitor.status !== "PENDING" || !exhibitor.appliedAt) {
		throw new Error("Only pending, completed applications can be decided");
	}

	if (exhibitor.submissionId) {
		const result =
			decision === "APPROVED"
				? await deskAcceptSubmission(
						exhibitor.submissionId,
						adminUserId,
						reason,
					)
				: await deskRejectSubmission(
						exhibitor.submissionId,
						adminUserId,
						reason,
					);
		if (!result.success) {
			throw new Error(result.error ?? "Failed to decide linked presentation");
		}
	}

	await prisma.exhibitor.update({
		where: { id },
		data: { status: decision, decidedAt: new Date(), decidedById: adminUserId },
	});

	await logActivity({
		type: decision === "APPROVED" ? "EXHIBITOR_APPROVED" : "EXHIBITOR_REJECTED",
		userId: exhibitor.userId,
		performedBy: adminUserId,
		submissionId: exhibitor.submissionId ?? undefined,
		detail:
			decision === "APPROVED"
				? activityDetail("EXHIBITOR_APPROVED", { reason })
				: activityDetail("EXHIBITOR_REJECTED", { reason }),
	});

	const conferenceName = await getSetting("CONFERENCE_NAME");
	void sendEmail(
		decision === "APPROVED" ? "EXHIBITOR_APPROVED" : "EXHIBITOR_REJECTED",
		exhibitor.user.email,
		{
			firstName: exhibitor.user.firstName ?? exhibitor.user.email,
			companyName: exhibitor.companyName ?? "",
			reason,
			conferenceName,
		},
	);
}
