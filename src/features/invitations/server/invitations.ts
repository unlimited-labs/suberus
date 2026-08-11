import { randomBytes } from "node:crypto";
import { addHours, format } from "date-fns";
import { env } from "@/env.ts";
import { logActivity } from "@/features/activity-log/server/activity-log";
import { activityDetail } from "@/features/activity-log/types";
import { getSetting } from "@/features/settings/server/settings";
import type { InvitationStatus, UserRole } from "@/generated/prisma/enums";
import { logger } from "@/logger.ts";
import { roleLabels } from "@/shared/lib/labels/user-role";
import { prisma } from "@/shared/server/db.server";
import { sendEmail } from "@/shared/server/email";

export interface AdminInvitation {
	id: string;
	email: string;
	role: UserRole;
	status: InvitationStatus;
	expiresAt: Date;
	createdAt: Date;
	usedAt: Date | null;
	createdBy: { firstName: string | null; lastName: string | null };
}

export async function getInvitations(): Promise<AdminInvitation[]> {
	// Lazy-expire: bulk update PENDING → EXPIRED where expiresAt < now
	await prisma.invitation.updateMany({
		where: { status: "PENDING", expiresAt: { lt: new Date() } },
		data: { status: "EXPIRED" },
	});

	return prisma.invitation.findMany({
		select: {
			id: true,
			email: true,
			role: true,
			status: true,
			expiresAt: true,
			createdAt: true,
			usedAt: true,
			createdBy: { select: { firstName: true, lastName: true } },
		},
		orderBy: { createdAt: "desc" },
	});
}

export async function createInvitation(
	rawEmail: string,
	role: UserRole,
	createdById: string,
): Promise<{ success: boolean }> {
	// better-auth lower-cases the address at sign-up, so invitations must match
	// that form or the redeemer's email never equals the invited one.
	const email = rawEmail.trim().toLowerCase();
	const existingUser = await prisma.user.findUnique({ where: { email } });
	if (existingUser) {
		throw new Error("User with this email already exists");
	}

	// Cancel any existing PENDING invitation for same email
	await prisma.invitation.updateMany({
		where: { email, status: "PENDING" },
		data: { status: "CANCELLED" },
	});

	const token = randomBytes(32).toString("hex");
	const validityHours = await getSetting("INVITATION_VALIDITY_HOURS");
	const expiresAt = addHours(new Date(), validityHours);

	await prisma.invitation.create({
		data: { email, role, token, expiresAt, createdById },
	});

	const conferenceName = await getSetting("CONFERENCE_NAME");
	const registrationUrl = `${env.APP_BASE_URL}/register?token=${token}`;
	const roleName = roleLabels[role];

	await sendEmail("INVITATION", email, {
		conferenceName,
		roleName,
		registrationUrl,
		expiresAt: format(expiresAt, "MMMM d, yyyy, hh:mm a"),
	});

	logger.info(`[invitation] created for ${email} role=${role}`);

	await logActivity({
		type: "INVITATION_CREATED",
		performedBy: createdById,
		detail: activityDetail("INVITATION_CREATED", { email, role }),
	});

	return { success: true };
}

export async function cancelInvitation(
	id: string,
	performedBy?: string,
): Promise<{ success: boolean }> {
	// USED/CANCELLED are terminal: cancelling a redeemed invitation would
	// overwrite the audit trail of who used it and when.
	const existing = await prisma.invitation.findUnique({ where: { id } });
	if (existing?.status !== "PENDING" && existing?.status !== "EXPIRED") {
		return { success: false };
	}

	await prisma.invitation.update({
		where: { id },
		data: { status: "CANCELLED" },
	});
	logger.info(`[invitation] cancelled ${id}`);

	await logActivity({
		type: "INVITATION_CANCELLED",
		performedBy,
		detail: activityDetail("INVITATION_CANCELLED"),
	});

	return { success: true };
}

export async function resendInvitation(
	id: string,
): Promise<{ success: boolean }> {
	const existing = await prisma.invitation.findUnique({ where: { id } });
	if (existing?.status !== "PENDING" && existing?.status !== "EXPIRED") {
		return { success: false };
	}

	const token = randomBytes(32).toString("hex");
	const validityHours = await getSetting("INVITATION_VALIDITY_HOURS");
	const expiresAt = addHours(new Date(), validityHours);

	// Revives a lazily-expired row: without the status reset the fresh token is
	// emailed but validateInvitationToken rejects it as non-PENDING.
	const invitation = await prisma.invitation.update({
		where: { id },
		data: { token, expiresAt, status: "PENDING" },
	});

	const conferenceName = await getSetting("CONFERENCE_NAME");
	const registrationUrl = `${env.APP_BASE_URL}/register?token=${token}`;
	const roleName = roleLabels[invitation.role];

	await sendEmail("INVITATION", invitation.email, {
		conferenceName,
		roleName,
		registrationUrl,
		expiresAt: format(expiresAt, "MMMM d, yyyy, hh:mm a"),
	});

	return { success: true };
}

export async function validateInvitationToken(
	token: string,
): Promise<{ email: string; role: UserRole } | null> {
	const invitation = await prisma.invitation.findUnique({ where: { token } });
	if (!invitation) return null;
	if (invitation.status !== "PENDING") return null;
	if (invitation.expiresAt < new Date()) return null;
	return { email: invitation.email, role: invitation.role };
}

/**
 * Returns a result instead of throwing: a Response thrown from a server fn
 * resolves the client promise in TanStack Start, so the caller could never see
 * the failure and the invitee would silently keep the default role.
 */
export async function consumeInvitation(
	token: string,
	userId: string,
): Promise<{ success: boolean }> {
	const invitation = await prisma.invitation.findUnique({ where: { token } });
	if (invitation?.status !== "PENDING" || invitation.expiresAt < new Date()) {
		return { success: false };
	}

	// The invited role is granted here, so the redeemer must be the invitee:
	// without this check any authenticated user holding a leaked token could
	// consume an ADMIN invitation and escalate their own role.
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { email: true, role: true },
	});
	if (user?.email.toLowerCase() !== invitation.email.toLowerCase()) {
		return { success: false };
	}

	// createInvitation rejects addresses that already have an account, so a
	// legitimate redeemer is always a fresh AUTHOR. Anything else means the role
	// was set by an admin after the invite went out — burn the token, keep the role.
	if (user.role !== "AUTHOR") {
		await prisma.invitation.update({
			where: { id: invitation.id },
			data: { status: "USED", usedById: userId, usedAt: new Date() },
		});
		logger.warn(
			`[invitation] not applied: user ${userId} already holds role ${user.role}`,
		);
		return { success: false };
	}

	await prisma.$transaction([
		prisma.invitation.update({
			where: { id: invitation.id },
			data: {
				status: "USED",
				usedById: userId,
				usedAt: new Date(),
				roleAppliedAt: new Date(),
			},
		}),
		prisma.user.update({
			where: { id: userId },
			data: { role: invitation.role },
		}),
	]);

	logger.info(
		`[invitation] consumed by user ${userId} role=${invitation.role}`,
	);

	await logActivity({
		type: "INVITATION_USED",
		userId,
		detail: activityDetail("INVITATION_USED", { email: invitation.email }),
	});

	return { success: true };
}
