import { randomBytes } from "node:crypto";
import { prisma } from "@/db.server";
import type { InvitationStatus, UserRole } from "@/generated/prisma/enums";
import { sendEmail } from "@/lib/server/email";
import { logger } from "@/lib/server/logger";
import { getSetting } from "@/utils/settings.server";

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
		throw new Response("User with this email already exists", { status: 400 });
	}

	// Cancel any existing PENDING invitation for same email
	await prisma.invitation.updateMany({
		where: { email, status: "PENDING" },
		data: { status: "CANCELLED" },
	});

	const token = randomBytes(32).toString("hex");
	const validityHours = await getSetting("INVITATION_VALIDITY_HOURS");
	const expiresAt = new Date(Date.now() + validityHours * 60 * 60 * 1000);

	await prisma.invitation.create({
		data: { email, role, token, expiresAt, createdById },
	});

	const conferenceName = await getSetting("CONFERENCE_NAME");
	const registrationUrl = `${process.env.APP_BASE_URL}/register?token=${token}`;
	const roleName = role === "EDITOR" ? "Editor" : "Reviewer";

	await sendEmail("INVITATION", email, {
		conferenceName,
		roleName,
		registrationUrl,
		expiresAt: expiresAt.toLocaleDateString("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		}),
	});

	logger.info(`[invitation] created for ${email} role=${role}`);

	return { success: true };
}

export async function cancelInvitation(
	id: string,
): Promise<{ success: boolean }> {
	await prisma.invitation.update({
		where: { id },
		data: { status: "CANCELLED" },
	});
	logger.info(`[invitation] cancelled ${id}`);
	return { success: true };
}

export async function resendInvitation(
	id: string,
): Promise<{ success: boolean }> {
	const token = randomBytes(32).toString("hex");
	const validityHours = await getSetting("INVITATION_VALIDITY_HOURS");
	const expiresAt = new Date(Date.now() + validityHours * 60 * 60 * 1000);

	const invitation = await prisma.invitation.update({
		where: { id },
		data: { token, expiresAt },
	});

	const conferenceName = await getSetting("CONFERENCE_NAME");
	const registrationUrl = `${process.env.APP_BASE_URL}/register?token=${token}`;
	const roleName = invitation.role === "EDITOR" ? "Editor" : "Reviewer";

	await sendEmail("INVITATION", invitation.email, {
		conferenceName,
		roleName,
		registrationUrl,
		expiresAt: expiresAt.toLocaleDateString("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		}),
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
	if (!invitation || invitation.status !== "PENDING") {
		throw new Response("Invalid invitation", { status: 400 });
	}

	await prisma.invitation.update({
		where: { id: invitation.id },
		data: { status: "USED", usedById: userId, usedAt: new Date() },
	});

	logger.info(`[invitation] consumed by user ${userId}`);

	return { success: true };
}

export async function applyInvitationRole(
	userId: string,
	email: string,
): Promise<void> {
	const invitation = await prisma.invitation.findFirst({
		where: { email, status: "USED", usedById: userId },
	});
	if (!invitation) return;

	await prisma.user.update({
		where: { id: userId },
		data: { role: invitation.role },
	});
}
