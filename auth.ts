import {PrismaClient, UserRole} from "@/generated/prisma/client";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import {PrismaPg} from "@prisma/adapter-pg";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    advanced: {
        database: {
            generateId: false,
        },
    },
    user: {
        modelName: "users",
        fields: {
            name: "lastName",
            email: "email",
        },
        additionalFields: {
            role: {
                type: Object.keys(UserRole) as (keyof typeof UserRole)[],
                required: false,
                defaultValue: UserRole.AUTHOR,
                input: false,
            },
        },
    },
    session: {
        modelName: "user_sessions",
    },
    account: {
        modelName: "accounts",
    },
    verification: {
        modelName: "email_verifications",
    }


});