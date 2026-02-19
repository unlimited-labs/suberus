import type { UserRole } from "@/generated/prisma/enums";
import { useSession } from "@/hooks/use-session";

const ADMIN_ROLES: UserRole[] = ["ADMIN", "EDITOR"];

export function useAdminAuth() {
	const { user, isPending } = useSession();

	const isAdmin = user ? ADMIN_ROLES.includes(user.role) : false;
	const isOnlyAdmin = user?.role === "ADMIN";

	return {
		user,
		isPending,
		isAdmin,
		isOnlyAdmin,
		canChangeRoles: isOnlyAdmin,
		canEditProfiles: isOnlyAdmin,
		canDeleteUsers: isOnlyAdmin,
	};
}
