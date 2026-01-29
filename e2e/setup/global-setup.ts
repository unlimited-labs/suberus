import { PrismaClient } from "../../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { auth } from "../../auth"
import { config } from "dotenv"
import { dirname, resolve } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load .env.local
config({ path: resolve(__dirname, "../../.env.local") })

const TEST_USER = {
	email: "test@e2e.local",
	password: "testpass123",
	firstName: "Test",
	lastName: "User",
	affiliationName: "Test University",
}

const ADMIN_USER = {
	email: "admin@e2e.local",
	password: "testpass123",
	firstName: "Admin",
	lastName: "User",
	affiliationName: "Admin University",
}

async function globalSetup() {
	const connectionString = process.env.DATABASE_URL
	const adapter = new PrismaPg({ connectionString })
	const prisma = new PrismaClient({ adapter })

	try {
		// Clean up all test data
		await prisma.session.deleteMany()
		await prisma.account.deleteMany()
		await prisma.fee.deleteMany()
		await prisma.user.deleteMany()

		// Create affiliations first
		const testAffiliation = await prisma.affiliation.upsert({
			where: { name: TEST_USER.affiliationName },
			update: {},
			create: { name: TEST_USER.affiliationName },
		})

		const adminAffiliation = await prisma.affiliation.upsert({
			where: { name: ADMIN_USER.affiliationName },
			update: {},
			create: { name: ADMIN_USER.affiliationName },
		})

		// Create test user via better-auth API
		const testResult = await auth.api.signUpEmail({
			body: {
				email: TEST_USER.email,
				password: TEST_USER.password,
				name: TEST_USER.lastName,
				firstName: TEST_USER.firstName,
				affiliationId: testAffiliation.id,
			},
		})

		if (!testResult?.user) {
			throw new Error("Failed to create test user")
		}

		// Update test user with additional fields
		await prisma.user.update({
			where: { id: testResult.user.id },
			data: { emailVerified: true, isActive: true },
		})

		console.log(`✅ Test user created: ${TEST_USER.email}`)

		// Create admin user via better-auth API
		const adminResult = await auth.api.signUpEmail({
			body: {
				email: ADMIN_USER.email,
				password: ADMIN_USER.password,
				name: ADMIN_USER.lastName,
				firstName: ADMIN_USER.firstName,
				affiliationId: adminAffiliation.id,
			},
		})

		if (!adminResult?.user) {
			throw new Error("Failed to create admin user")
		}

		// Update admin user with role and additional fields
		await prisma.user.update({
			where: { id: adminResult.user.id },
			data: { emailVerified: true, isActive: true, role: "ADMIN" },
		})

		console.log(`✅ Admin user created: ${ADMIN_USER.email}`)
	} catch (error) {
		console.error("❌ Failed to seed test user:", error)
		throw error
	} finally {
		await prisma.$disconnect()
	}
}

export default globalSetup
