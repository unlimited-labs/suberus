import { useMemo } from "react";
import type { UserRole } from "@/generated/prisma/enums";
import { useSession as useBetterAuthSession } from "@/lib/auth-client";

export interface SessionUser {
	id: string;
	email: string;
	firstName: string | null;
	lastName: string | null;
	title: string | null;
	affiliationId: string | null;
	orcid: string | null;
	address: string | null;
	country: string | null;
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
	title: string | null;
	affiliationId: string | null;
	orcid: string | null;
	address: string | null;
	country: string | null;
	role: UserRole;
	image: string | null;
	emailVerified: boolean;
	createdAt: Date;
	updatedAt: Date;
}

export function useSession() {
	const session = useBetterAuthSession();

	const rawUser = session.data?.user as BetterAuthUser | undefined;

	// Map better-auth's "name" to our "lastName"
	const user = useMemo<SessionUser | undefined>(() => {
		if (!rawUser) return undefined;
		return {
			...rawUser,
			lastName: rawUser.name,
		};
	}, [rawUser]);

	return {
		user,
		session: session.data?.session,
		isPending: session.isPending,
		isAuthenticated: !!user,
		error: session.error,
		refetch: session.refetch,
	};
}
