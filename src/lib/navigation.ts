import {
	IconDashboard,
	IconFileText,
	IconClipboardCheck,
	IconSettings,
} from "@tabler/icons-react"
import type { ComponentType } from "react"

export interface NavItem {
	name: string
	href: string
	icon: ComponentType<{ className?: string }>
}

export const navigation: NavItem[] = [
	{ name: "Dashboard", href: "/", icon: IconDashboard },
	{ name: "Submissions", href: "/submissions", icon: IconFileText },
	{ name: "Reviews", href: "/reviews", icon: IconClipboardCheck },
	{ name: "Settings", href: "/settings", icon: IconSettings },
]

export const mockUser = {
	name: "Jan Kowalski",
	email: "jan@example.com",
	role: "EDITOR" as const,
	avatarUrl: null as string | null,
}
