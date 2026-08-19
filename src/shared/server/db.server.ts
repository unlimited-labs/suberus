import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "@/env.ts";
import { PrismaClient } from "@/generated/prisma/client.js";

const connectionString = env.DATABASE_URL;
if (!connectionString) {
	throw new Error("DATABASE_URL environment variable is not set");
}

const adapter = new PrismaPg({
	connectionString,
});

declare global {
	var __prisma: PrismaClient | undefined;
}

// Always cache on globalThis: the prod bundle can emit this module into two
// chunks, and a second PrismaClient re-instantiates the query-compiler wasm over
// the runtime's module-global state, corrupting the first client's memory view.
globalThis.__prisma ??= new PrismaClient({ adapter });
export const prisma = globalThis.__prisma;

/** True for a Prisma unique-constraint violation (P2002) — for find-then-create races. */
export function isUniqueViolation(e: unknown): boolean {
	return (
		typeof e === "object" &&
		e !== null &&
		"code" in e &&
		(e as { code?: unknown }).code === "P2002"
	);
}
