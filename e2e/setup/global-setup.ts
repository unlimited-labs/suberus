import { PrismaClient } from "../../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { hashPassword } from "better-auth/crypto"
import { config } from "dotenv"
import { dirname, resolve } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load .env.local
config({ path: resolve(__dirname, "../../.env.local") })

const TEST_USER = {
	email: "test@e2e.local",
	password: "TestPassword123!",
	firstName: "Test",
	lastName: "User",
	affiliationName: "Test University",
}

const ADMIN_USER = {
	email: "admin@e2e.local",
	password: "AdminPassword123!",
	firstName: "Admin",
	lastName: "User",
	affiliationName: "Admin University",
}

async function globalSetup() {
	const connectionString = process.env.DATABASE_URL
	const adapter = new PrismaPg({ connectionString })
	const prisma = new PrismaClient({ adapter })

	try {
		// Check if test user already exists
		const existingUser = await prisma.user.findUnique({
			where: { email: TEST_USER.email },
		})

		if (!existingUser) {
			// Hash password using Better Auth's internal hashing
			const hashedPassword = await hashPassword(TEST_USER.password)

			// Create or find affiliation
			const affiliation = await prisma.affiliation.upsert({
				where: { name: TEST_USER.affiliationName },
				update: {},
				create: { name: TEST_USER.affiliationName },
			})

			// Create user
			const user = await prisma.user.create({
				data: {
					email: TEST_USER.email,
					firstName: TEST_USER.firstName,
					lastName: TEST_USER.lastName,
					affiliationId: affiliation.id,
					emailVerified: true,
					isActive: true,
				},
			})

			// Create account with password (Better Auth credential provider)
			await prisma.account.create({
				data: {
					userId: user.id,
					accountId: user.id,
					providerId: "credential",
					password: hashedPassword,
				},
			})

			console.log(`✅ Test user created: ${TEST_USER.email}`)
		} else {
			console.log(`ℹ️ Test user already exists: ${TEST_USER.email}`)
		}

		// Create admin user for admin panel tests
		const existingAdmin = await prisma.user.findUnique({
			where: { email: ADMIN_USER.email },
		})

		if (!existingAdmin) {
			const hashedPassword = await hashPassword(ADMIN_USER.password)

			const affiliation = await prisma.affiliation.upsert({
				where: { name: ADMIN_USER.affiliationName },
				update: {},
				create: { name: ADMIN_USER.affiliationName },
			})

			const adminUser = await prisma.user.create({
				data: {
					email: ADMIN_USER.email,
					firstName: ADMIN_USER.firstName,
					lastName: ADMIN_USER.lastName,
					affiliationId: affiliation.id,
					emailVerified: true,
					isActive: true,
					role: "ADMIN",
				},
			})

			await prisma.account.create({
				data: {
					userId: adminUser.id,
					accountId: adminUser.id,
					providerId: "credential",
					password: hashedPassword,
				},
			})

			console.log(`✅ Admin user created: ${ADMIN_USER.email}`)
		} else {
			console.log(`ℹ️ Admin user already exists: ${ADMIN_USER.email}`)
		}
	} catch (error) {
		console.error("❌ Failed to seed test user:", error)
		throw error
	} finally {
		await prisma.$disconnect()
	}
}

export default globalSetup
