import type { UserRole } from "@/generated/prisma/enums";

export const roleLabels = {
	ADMIN: "Administrator",
	EDITOR: "Editor",
	REVIEWER: "Reviewer",
	AUTHOR: "Author",
	EXHIBITOR: "Exhibitor",
} satisfies Record<UserRole, string>;
