import { PrismaClient, UserRole } from "@/generated/prisma/client"
import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { tanstackStartCookies } from "better-auth/tanstack-start"
import { PrismaPg } from "@prisma/adapter-pg"
import { randomUUID } from "crypto"
import "dotenv/config"

const connectionString = process.env.DATABASE_URL
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

export const auth = betterAuth({
	baseURL: process.env.AUTH_URL,
	secret: process.env.AUTH_SECRET,
	trustedOrigins:
		process.env.NODE_ENV === "development"
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
		requireEmailVerification: false,
		minPasswordLength: 10,
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
})
