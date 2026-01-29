import {
	IconAdjustments,
	IconClipboardCheck,
	IconDashboard,
	IconFileStack,
	IconFileText,
	IconSettings,
	IconUsers,
} from "@tabler/icons-react";
import type { ComponentType } from "react";
import type { UserRole } from "@/generated/prisma";

export interface NavItem {
	name: string;
	href: string;
	icon: ComponentType<{ className?: string }>;
}

export interface NavSection {
	title?: string;
	items: NavItem[];
	roles?: UserRole[]; // undefined = visible to all
}

export const navigationSections: NavSection[] = [
	{
		items: [
			{ name: "Dashboard", href: "/", icon: IconDashboard },
			{ name: "Submissions", href: "/submissions", icon: IconFileText },
			{ name: "Reviews", href: "/reviews", icon: IconClipboardCheck },
			{ name: "Settings", href: "/settings", icon: IconSettings },
		],
	},
	{
		title: "Administration",
		roles: ["ADMIN", "EDITOR"],
		items: [
			{ name: "Users", href: "/admin/users", icon: IconUsers },
			{ name: "Submissions", href: "/admin/submissions", icon: IconFileStack },
			{ name: "Configuration", href: "/admin/settings", icon: IconAdjustments },
		],
	},
];

// Helper to filter sections by user role
export function getNavigationForRole(role: UserRole): NavSection[] {
	return navigationSections.filter(
		(section) => !section.roles || section.roles.includes(role),
	);
}
