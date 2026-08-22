import type { UserRole } from "@/generated/prisma/enums";
import { authClient } from "@/shared/lib/auth-client";

// Mirrors the get-session payload. Fields marked `returned: false` in
// auth.server (title, needInvoice, address, country) are intentionally absent —
// the app reads those from the DB via the profile slice queries.
export interface SessionUser {
	id: string;
	email: string;
	firstName: string | null;
	lastName: string | null;
	affiliationId: string | null;
	role: UserRole;
	image: string | null;
	emailVerified: boolean;
	createdAt: Date;
	updatedAt: Date;
}

// better-auth returns "name" but we store it as "lastName" in DB
interface BetterAuthUser {
	id: string;
	email: string;
	name: string | null;
	firstName: string | null;
	affiliationId: string | null;
	role: UserRole;
	image: string | null;
	emailVerified: boolean;
	createdAt: Date;
	updatedAt: Date;
}

export function useSession() {
	const session = authClient.useSession();

	// SAFETY: our better-auth config declares these additionalFields on the session user.
	const rawUser = session.data?.user as BetterAuthUser | undefined;

	const user: SessionUser | undefined = rawUser
		? { ...rawUser, lastName: rawUser.name }
		: undefined;

	return {
		user,
		session: session.data?.session,
		isPending: session.isPending,
		isAuthenticated: !!user,
		error: session.error,
		refetch: session.refetch,
	};
}
