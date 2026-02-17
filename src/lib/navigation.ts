import {
	IconAdjustments,
	IconCash,
	IconClipboardCheck,
	IconDashboard,
	IconFileStack,
	IconFileText,
	IconMailPlus,
	IconUser,
	IconUsers,
} from "@tabler/icons-react";
import type { ComponentType } from "react";
import type { UserRole } from "@/generated/prisma/enums";

export interface NavItem {
	name: string;
	href: string;
	icon: ComponentType<{ className?: string }>;
	roles?: UserRole[]; // undefined = visible to all
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
			{ name: "Fee", href: "/fee", icon: IconCash },
			{
				name: "Reviews",
				href: "/reviews",
				icon: IconClipboardCheck,
				roles: ["REVIEWER", "EDITOR", "ADMIN"],
			},
			{ name: "Profile", href: "/profile", icon: IconUser },
		],
	},
	{
		title: "Administration",
		roles: ["ADMIN", "EDITOR"],
		items: [
			{ name: "Dashboard", href: "/admin/dashboard", icon: IconDashboard },
			{ name: "Users", href: "/admin/users", icon: IconUsers },
			{
				name: "Invitations",
				href: "/admin/invitations",
				icon: IconMailPlus,
				roles: ["ADMIN"],
			},
			{ name: "Submissions", href: "/admin/submissions", icon: IconFileStack },
			{ name: "Configuration", href: "/admin/settings", icon: IconAdjustments },
		],
	},
];

// Helper to filter sections and items by user role
export function getNavigationForRole(role: UserRole): NavSection[] {
	return navigationSections
		.filter((section) => !section.roles || section.roles.includes(role))
		.map((section) => ({
			...section,
			items: section.items.filter(
				(item) => !item.roles || item.roles.includes(role),
			),
		}))
		.filter((section) => section.items.length > 0);
}
