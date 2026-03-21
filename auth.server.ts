import { PrismaClient, UserRole } from "@/generated/prisma/client"
import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { tanstackStartCookies } from "better-auth/tanstack-start"
import { PrismaPg } from "@prisma/adapter-pg"
import { randomUUID } from "crypto"
import "dotenv/config"
import { sendEmail } from "@/lib/server/email"
import { logger } from "@/logger.ts"
import { getSetting } from "@/utils/settings.server"
import { applyInvitationRole } from "@/lib/server/admin/invitations"
import { linkCoAuthorsByEmail } from "@/utils/submissions.server"
import { env } from "@/env"

const connectionString = env.DATABASE_URL
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

export const auth = betterAuth({
	baseURL: env.APP_BASE_URL,
	secret: env.AUTH_SECRET,
	trustedOrigins:
		env.NODE_ENV === "development"
			? ["http://localhost:3001", "http://localhost:3002", "http://localhost:3003"]
			: [],
	database: prismaAdapter(prisma, {
		provider: "postgresql",
	}),
	plugins: [tanstackStartCookies()],
	advanced: {
		database: {
			generateId: () => randomUUID(),
		},
	},
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: false, // Soft-block: users can login, but app restricts actions
		minPasswordLength: 10,
		sendResetPassword: async ({ user, url }) => {
			const extUser = user as typeof user & { firstName?: string }
			await sendEmail("PASSWORD_RESET", user.email, {
				firstName: extUser.firstName ?? user.email,
				resetUrl: url,
				conferenceName: await getSetting("CONFERENCE_NAME"),
			})
		},
	},
	emailVerification: {
		sendOnSignUp: true,
		autoSignInAfterVerification: true,
		callbackURL: "/?verified=true",
		expiresIn: 24 * 60 * 60, // 24h
		sendVerificationEmail: async ({ user, url }) => {
			const extUser = user as typeof user & { firstName?: string }
			await sendEmail("EMAIL_VERIFICATION", user.email, {
				firstName: extUser.firstName ?? user.email,
				verificationUrl: url,
				conferenceName: await getSetting("CONFERENCE_NAME"),
			})
		},
	},
	user: {
		modelName: "user",
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
			title: {
				type: "string",
				required: false,
				input: true,
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
			},
			country: {
				type: "string",
				required: false,
				input: true,
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
		user: {
			create: {
				after: async (user) => {
					const { logActivity } = await import("@/lib/server/activity-log")
					const { activityDetail } = await import("@/lib/activity-log")
					await logActivity({
						type: "USER_REGISTERED",
						userId: user.id,
						detail: activityDetail("USER_REGISTERED", { email: user.email }),
					})
					const extUser = user as typeof user & { firstName?: string }
					void sendEmail("ACCOUNT_CREATED", user.email, {
						firstName: extUser.firstName ?? user.email,
						conferenceName: await getSetting("CONFERENCE_NAME"),
					})
				},
			},
			update: {
				after: async (user) => {
					if (!user.emailVerified) return
					await linkCoAuthorsByEmail(user.email, user.id)
					await applyInvitationRole(user.id, user.email)
					// Log self-service email verification (idempotent — checks if already logged)
					const { prisma: dbClient } = await import("@/db.server")
					const alreadyLogged = await dbClient.activityLog.findFirst({
						where: { userId: user.id, type: "USER_EMAIL_VERIFIED" },
					})
					if (!alreadyLogged) {
						const { logActivity } = await import("@/lib/server/activity-log")
						await logActivity({
							type: "USER_EMAIL_VERIFIED",
							userId: user.id,
						})
					}
				},
			},
		},
	},
})
