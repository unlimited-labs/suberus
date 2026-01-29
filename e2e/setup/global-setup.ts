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
		// Clean up e2e test data before seeding
		const e2eUsers = await prisma.user.findMany({
			where: { email: { endsWith: "@e2e.local" } },
			select: { id: true },
		})
		const e2eUserIds = e2eUsers.map((u) => u.id)

		if (e2eUserIds.length > 0) {
			// Delete in correct order (respecting foreign keys)
			await prisma.session.deleteMany({ where: { userId: { in: e2eUserIds } } })
			await prisma.account.deleteMany({ where: { userId: { in: e2eUserIds } } })
			await prisma.fee.deleteMany({ where: { userId: { in: e2eUserIds } } })
			await prisma.user.deleteMany({ where: { id: { in: e2eUserIds } } })
			console.log(`🧹 Cleaned up ${e2eUserIds.length} e2e test users`)
		}

		// Create test user
		const testHashedPassword = await hashPassword(TEST_USER.password)

		const testAffiliation = await prisma.affiliation.upsert({
			where: { name: TEST_USER.affiliationName },
			update: {},
			create: { name: TEST_USER.affiliationName },
		})

		const testUser = await prisma.user.create({
			data: {
				email: TEST_USER.email,
				firstName: TEST_USER.firstName,
				lastName: TEST_USER.lastName,
				affiliationId: testAffiliation.id,
				emailVerified: true,
				isActive: true,
			},
		})

		await prisma.account.create({
			data: {
				userId: testUser.id,
				accountId: testUser.id,
				providerId: "credential",
				password: testHashedPassword,
			},
		})

		console.log(`✅ Test user created: ${TEST_USER.email}`)

		// Create admin user for admin panel tests
		const adminHashedPassword = await hashPassword(ADMIN_USER.password)

		const adminAffiliation = await prisma.affiliation.upsert({
			where: { name: ADMIN_USER.affiliationName },
			update: {},
			create: { name: ADMIN_USER.affiliationName },
		})

		const adminUser = await prisma.user.create({
			data: {
				email: ADMIN_USER.email,
				firstName: ADMIN_USER.firstName,
				lastName: ADMIN_USER.lastName,
				affiliationId: adminAffiliation.id,
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
				password: adminHashedPassword,
			},
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
