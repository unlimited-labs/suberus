import type { UserRole } from "@/generated/prisma/enums";

/** User role display map. Shared so invitations can render roles without
 * importing the users slice. */
export const roleLabels = {
	ADMIN: "Administrator",
	EDITOR: "Editor",
	REVIEWER: "Reviewer",
	AUTHOR: "Author",
	EXHIBITOR: "Exhibitor",
} satisfies Record<UserRole, string>;
