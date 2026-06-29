import {
	IconAdjustments,
	IconBuildingStore,
	IconCalendar,
	IconCalendarEvent,
	IconCash,
	IconClipboardCheck,
	IconDashboard,
	IconFileCertificate,
	IconFileStack,
	IconFileText,
	IconMailForward,
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
	external?: boolean; // open in new tab
	requiresPublishedSchedule?: boolean; // only show when program is published
	requiresExhibitorsEnabled?: boolean; // only show when the exhibitors feature is on
	requiresFeeEnabled?: boolean; // only show when the fee feature is on
	requiresDocuments?: boolean; // only show when the user has ≥1 generated document
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
			{
				name: "Program",
				href: "/program",
				icon: IconCalendarEvent,
				external: true,
				requiresPublishedSchedule: true,
			},
			{
				name: "Submissions",
				href: "/submissions",
				icon: IconFileText,
				roles: ["AUTHOR", "REVIEWER", "EDITOR", "ADMIN"],
			},
			{
				name: "Exhibitor",
				href: "/exhibitor",
				icon: IconBuildingStore,
				roles: ["EXHIBITOR"],
			},
			{
				name: "Fee",
				href: "/fee",
				icon: IconCash,
				requiresFeeEnabled: true,
			},
			{
				name: "Reviews",
				href: "/reviews",
				icon: IconClipboardCheck,
				roles: ["REVIEWER", "EDITOR", "ADMIN"],
			},
			{
				name: "My Documents",
				href: "/documents",
				icon: IconFileCertificate,
				requiresDocuments: true,
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
			{
				name: "Email campaigns",
				href: "/admin/bulk-email",
				icon: IconMailForward,
			},
			{
				name: "Documents",
				href: "/admin/documents",
				icon: IconFileCertificate,
			},
			{
				name: "Exhibitors",
				href: "/admin/exhibitors",
				icon: IconBuildingStore,
				requiresExhibitorsEnabled: true,
			},
			{
				name: "Program Planner",
				href: "/admin/program-planner",
				icon: IconCalendar,
				roles: ["ADMIN", "EDITOR"],
			},
			{
				name: "Settings",
				href: "/admin/settings",
				icon: IconAdjustments,
				roles: ["ADMIN"],
			},
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
