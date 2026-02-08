import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { auth } from "../auth";
import { config } from "dotenv";
import { resolve } from "path";

// Load .env.local
config({ path: resolve(process.cwd(), ".env.local") });

const TEST_USERS = [
	{
		email: "user@e2e.local",
		password: "testpass123",
		firstName: "User",
		lastName: "Test",
		affiliationName: "Test Institution",
		role: "AUTHOR" as const,
	},
	{
		email: "admin@e2e.local",
		password: "testpass123",
		firstName: "Admin",
		lastName: "Test",
		affiliationName: "Admin Institution",
		role: "ADMIN" as const,
	},
];

async function seedTestUsers() {
	const connectionString = process.env.DATABASE_URL;
	if (!connectionString) {
		throw new Error("DATABASE_URL not found");
	}

	const adapter = new PrismaPg({ connectionString });
	const prisma = new PrismaClient({ adapter });

	try {
		console.log("🌱 Seeding test users...\n");

		for (const userData of TEST_USERS) {
			// Check if user already exists
			const existingUser = await prisma.user.findUnique({
				where: { email: userData.email },
			});

			if (existingUser) {
				console.log(`⏭️  User ${userData.email} already exists, skipping...`);
				continue;
			}

			// Create affiliation
			const affiliation = await prisma.affiliation.upsert({
				where: { name: userData.affiliationName },
				update: {},
				create: { name: userData.affiliationName },
			});

			// Create user via Better Auth
			const result = await auth.api.signUpEmail({
				body: {
					email: userData.email,
					password: userData.password,
					name: userData.lastName,
					firstName: userData.firstName,
					affiliationId: affiliation.id,
				},
			});

			if (!result?.user) {
				throw new Error(`Failed to create user: ${userData.email}`);
			}

			// Update user with role and verify email
			await prisma.user.update({
				where: { id: result.user.id },
				data: {
					role: userData.role,
					emailVerified: true,
					isActive: true,
					affiliationId: affiliation.id,
				},
			});

			console.log(`✅ Created user: ${userData.email} (${userData.role})`);
		}

		console.log("\n✨ Test users seeded successfully!");
		console.log("\nCredentials:");
		for (const user of TEST_USERS) {
			console.log(`  ${user.email} / ${user.password} (${user.role})`);
		}
	} catch (error) {
		console.error("❌ Seeding failed:", error);
		throw error;
	} finally {
		await prisma.$disconnect();
	}
}

seedTestUsers();
