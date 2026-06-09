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
		// Editors may change roles, but only ADMINs may grant/revoke the ADMIN
		// role or modify another admin (enforced server-side too).
		canChangeRoles: isAdmin,
		canAssignAdminRole: isOnlyAdmin,
		canEditProfiles: isOnlyAdmin,
		canDeleteUsers: isOnlyAdmin,
	};
}
