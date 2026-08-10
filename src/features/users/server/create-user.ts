import { randomBytes } from "node:crypto";
import { env } from "@/env";
import { logActivity } from "@/features/activity-log/server/activity-log";
import { activityDetail } from "@/features/activity-log/types";
import { auth } from "@/features/auth/server/auth.server";
import { getSetting } from "@/features/settings/server/settings";
import { upsertSurveyAnswers } from "@/features/survey/server/survey";
import { upsertAffiliation } from "@/shared/server/affiliations";
import { prisma } from "@/shared/server/db.server";
import { sendEmail } from "@/shared/server/email";
import { linkCoAuthorsByEmail } from "@/shared/server/link-coauthors";

const SET_PASSWORD_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface CreateUserByAdminInput {
	email: string;
	firstName: string;
	lastName: string;
	title?: string;
	affiliation?: string;
	needInvoice: boolean;
	address: string;
	country: string;
	answers: { questionId: string; value: string }[];
}

/**
 * Deliberately bypasses `auth.api.signUpEmail`: it always sends the verification
 * email and fires the better-auth user-create hooks (welcome + organizer
 * notification), none of which apply to an organizer-created account. The parts
 * of those hooks that do apply are replicated below.
 */
export async function createUserByAdmin(
	input: CreateUserByAdminInput,
	performedBy: string,
): Promise<{ id: string }> {
	// better-auth lowercases the email at sign-in, so a mixed-case row would
	// never match on login.
	const email = input.email.trim().toLowerCase();

	const existing = await prisma.user.findUnique({
		where: { email },
		select: { id: true },
	});
	if (existing) {
		throw new Response("Email already in use", { status: 409 });
	}

	const affiliationName = input.affiliation?.trim();
	const affiliation = affiliationName
		? await upsertAffiliation(affiliationName)
		: null;

	const user = await prisma.user.create({
		data: {
			email,
			firstName: input.firstName,
			lastName: input.lastName,
			title: input.title || null,
			affiliationId: affiliation?.id ?? null,
			needInvoice: input.needInvoice,
			address: input.address || null,
			country: input.country || null,
			role: "AUTHOR",
			isActive: true,
			emailVerified: true,
		},
		select: { id: true },
	});

	const authContext = await auth.$context;
	await prisma.account.create({
		data: {
			userId: user.id,
			accountId: user.id,
			providerId: "credential",
			password: await authContext.password.hash(
				randomBytes(24).toString("base64url"),
			),
		},
	});

	if (input.answers.length > 0) {
		await upsertSurveyAnswers(user.id, input.answers);
	}

	await logActivity({
		type: "USER_REGISTERED",
		userId: user.id,
		performedBy,
		detail: activityDetail("USER_REGISTERED", { email }),
	});

	await linkCoAuthorsByEmail(email, user.id);

	await sendSetPasswordEmail(user.id, email, input.firstName);

	return user;
}

async function sendSetPasswordEmail(
	userId: string,
	email: string,
	firstName: string,
): Promise<void> {
	const token = randomBytes(24).toString("hex");
	// `reset-password:<token>` is the identifier better-auth's reset endpoint
	// looks the token up under (better-auth 1.6.x, api/routes/password.mjs).
	await prisma.verification.create({
		data: {
			identifier: `reset-password:${token}`,
			value: userId,
			expiresAt: new Date(Date.now() + SET_PASSWORD_TTL_MS),
		},
	});

	await sendEmail("ACCOUNT_CREATED_BY_ADMIN", email, {
		firstName,
		email,
		setPasswordUrl: `${env.APP_BASE_URL}/reset-password?token=${token}`,
		conferenceName: await getSetting("CONFERENCE_NAME"),
	});
}
