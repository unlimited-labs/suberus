import type { UserRole } from "@/generated/prisma";
import { useSession as useBetterAuthSession } from "@/lib/auth-client";

export interface SessionUser {
	id: string;
	email: string;
	firstName: string | null;
	lastName: string | null;
	title: string | null;
	affiliation: string | null;
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

	const user = session.data?.user as SessionUser | undefined;

	return {
		user,
		session: session.data?.session,
		isPending: session.isPending,
		isAuthenticated: !!user,
		error: session.error,
		refetch: session.refetch,
	};
}
