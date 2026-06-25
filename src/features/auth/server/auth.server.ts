import { randomUUID } from "node:crypto";
import { passkey } from "@better-auth/passkey";
import { PrismaPg } from "@prisma/adapter-pg";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { env } from "@/env";
import { logActivity } from "@/features/activity-log/server/activity-log";
import { activityDetail } from "@/features/activity-log/types";
import { getSetting } from "@/features/settings/server/settings";
import { PrismaClient, UserRole } from "@/generated/prisma/client";
import { logger } from "@/logger.ts";
import { sendEmail } from "@/shared/server/email";
import { emitDomainEvent } from "@/shared/server/events";

import "dotenv/config";

const connectionString = env.DATABASE_URL;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

export const auth = betterAuth({
	baseURL: env.APP_BASE_URL,
	secret: env.AUTH_SECRET,
	trustedOrigins:
		env.NODE_ENV === "development"
			? [
					"http://localhost:3001",
					"http://localhost:3031",
					"http://localhost:3032",
					"http://localhost:3033",
				]
			: [],
	database: prismaAdapter(prisma, {
		provider: "postgresql",
	}),
	plugins: [
		tanstackStartCookies(),
		// rpName is only a label (shown in the OS passkey prompt); credential isolation
		// is by rpID = the instance's domain, so a shared name never collides across tenants.
		passkey({
			rpID: new URL(env.APP_BASE_URL).hostname,
			rpName: "Suberus",
			origin: new URL(env.APP_BASE_URL).origin,
			authenticatorSelection: {
				// Allow any authenticator, but require a discoverable credential +
				// user-verification gesture so mobile biometrics give usernameless login.
				residentKey: "required",
				userVerification: "required",
			},
		}),
	],
	advanced: {
		database: {
			generateId: () => randomUUID(),
		},
	},
	// Explicit throttling of auth endpoints (login, reset, sign-up). Since email
	// verification is a soft block, login is the brute-force surface — don't rely
	// on framework defaults silently changing.
	rateLimit: {
		// Throttle auth endpoints in production only. Left off in dev/E2E, where
		// there is no trusted proxy IP to key the limiter on (better-auth would
		// otherwise warn and skip on every request).
		enabled: env.NODE_ENV === "production" && !env.E2E,
		window: 60,
		max: 20,
	},
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: false, // Soft-block: users can login, but app restricts actions
		minPasswordLength: 10,
		sendResetPassword: async ({ user, url }) => {
			const extUser = user as typeof user & { firstName?: string };
			await sendEmail("PASSWORD_RESET", user.email, {
				firstName: extUser.firstName ?? user.email,
				resetUrl: url,
				conferenceName: await getSetting("CONFERENCE_NAME"),
			});
		},
	},
	emailVerification: {
		sendOnSignUp: true,
		autoSignInAfterVerification: true,
		callbackURL: "/?verified=true",
		expiresIn: 24 * 60 * 60, // 24h
		sendVerificationEmail: async ({ user, url }) => {
			const extUser = user as typeof user & { firstName?: string };
			await sendEmail("EMAIL_VERIFICATION", user.email, {
				firstName: extUser.firstName ?? user.email,
				verificationUrl: url,
				conferenceName: await getSetting("CONFERENCE_NAME"),
			});
		},
	},
	user: {
		modelName: "user",
		changeEmail: {
			enabled: true,
		},
		fields: {
			name: "lastName",
			email: "email",
		},
		additionalFields: {
			firstName: {
				type: "string",
				required: false,
				input: true,
			},
			// returned: false — these are write-only via the auth API (registration
			// + admin edit); the app reads them from the DB (profile slice queries),
			// so they don't need to bloat every get-session response.
			title: {
				type: "string",
				required: false,
				input: true,
				returned: false,
			},
			affiliationId: {
				type: "string",
				required: false,
				input: true,
			},
			address: {
				type: "string",
				required: false,
				input: true,
				returned: false,
			},
			country: {
				type: "string",
				required: false,
				input: true,
				returned: false,
			},
			needInvoice: {
				type: "boolean",
				required: false,
				input: true,
				returned: false,
			},
			role: {
				type: Object.keys(UserRole) as (keyof typeof UserRole)[],
				required: false,
				defaultValue: UserRole.AUTHOR,
				input: false,
			},
		},
	},
	onAPIError: {
		onError: (error, _ctx) => {
			logger.error("[auth] API error:", error);
		},
	},
	session: {
		modelName: "session",
		expiresIn: 60 * 60 * 24 * 7, // 7 days
		updateAge: 60 * 60 * 24, // 1 day
	},
	account: {
		modelName: "account",
	},
	verification: {
		modelName: "verification",
	},
	databaseHooks: {
		session: {
			create: {
				after: async (session) => {
					await prisma.user.update({
						where: { id: session.userId },
						data: { lastLoginAt: new Date() },
					});
				},
			},
		},
		user: {
			create: {
				after: async (user) => {
					await logActivity({
						type: "USER_REGISTERED",
						userId: user.id,
						detail: activityDetail("USER_REGISTERED", { email: user.email }),
					});
					const extUser = user as typeof user & {
						firstName?: string;
						affiliationId?: string;
					};
					void sendEmail("ACCOUNT_CREATED", user.email, {
						firstName: extUser.firstName ?? user.email,
						conferenceName: await getSetting("CONFERENCE_NAME"),
					});
					const contactEmail = await getSetting("CONTACT_EMAIL");
					if (contactEmail) {
						let affiliationName = "";
						if (extUser.affiliationId) {
							const affiliation = await prisma.affiliation.findUnique({
								where: { id: extUser.affiliationId },
								select: { name: true },
							});
							affiliationName = affiliation?.name ?? "";
						}
						void sendEmail("NEW_REGISTRATION_NOTIFY", contactEmail, {
							firstName: extUser.firstName ?? "",
							lastName: user.name ?? "",
							affiliation: affiliationName,
						});
					}
				},
			},
			update: {
				after: async (user) => {
					if (!user.emailVerified) return;
					await emitDomainEvent("userEmailVerified", {
						userId: user.id,
						email: user.email,
					});
					// Log self-service email verification (idempotent — checks if already logged)
					const alreadyLogged = await prisma.activityLog.findFirst({
						where: { userId: user.id, type: "USER_EMAIL_VERIFIED" },
					});
					if (!alreadyLogged) {
						await logActivity({
							type: "USER_EMAIL_VERIFIED",
							userId: user.id,
						});
					}
				},
			},
		},
	},
});
