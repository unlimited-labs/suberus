import { randomBytes } from "node:crypto";
import { addHours, format } from "date-fns";
import { prisma } from "@/db.server";
import { env } from "@/env.ts";
import type { InvitationStatus, UserRole } from "@/generated/prisma/enums";
import { activityDetail } from "@/lib/activity-log";
import { roleLabels } from "@/lib/labels/user";
import { logActivity } from "@/lib/server/activity-log";
import { sendEmail } from "@/lib/server/email";
import { getSetting } from "@/lib/server/settings";
import { logger } from "@/logger.ts";

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
	email: string,
	role: UserRole,
	createdById: string,
): Promise<{ success: boolean }> {
	// Check if email is already registered
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
	const token = randomBytes(32).toString("hex");
	const validityHours = await getSetting("INVITATION_VALIDITY_HOURS");
	const expiresAt = addHours(new Date(), validityHours);

	const invitation = await prisma.invitation.update({
		where: { id },
		data: { token, expiresAt },
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

export async function consumeInvitation(
	token: string,
	userId: string,
): Promise<{ success: boolean }> {
	const invitation = await prisma.invitation.findUnique({ where: { token } });
	if (invitation?.status !== "PENDING") {
		throw new Response("Invalid invitation", { status: 400 });
	}

	await prisma.invitation.update({
		where: { id: invitation.id },
		data: { status: "USED", usedById: userId, usedAt: new Date() },
	});

	logger.info(`[invitation] consumed by user ${userId}`);

	await logActivity({
		type: "INVITATION_USED",
		userId,
		detail: activityDetail("INVITATION_USED", { email: invitation.email }),
	});

	return { success: true };
}

export async function applyInvitationRole(
	userId: string,
	email: string,
): Promise<void> {
	// Apply the invited role exactly once. This runs from the user-update hook,
	// which fires on every profile change after verification; without the
	// roleAppliedAt guard an admin-issued demotion would be silently reverted
	// the next time the user edits their profile.
	const invitation = await prisma.invitation.findFirst({
		where: { email, status: "USED", usedById: userId, roleAppliedAt: null },
	});
	if (!invitation) return;

	await prisma.$transaction(async (tx) => {
		await tx.user.update({
			where: { id: userId },
			data: { role: invitation.role },
		});
		await tx.invitation.update({
			where: { id: invitation.id },
			data: { roleAppliedAt: new Date() },
		});
	});
}
