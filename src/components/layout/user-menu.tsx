import {
	IconDotsVertical,
	IconLogout,
	IconMoon,
	IconSettings,
	IconSun,
	IconDeviceDesktop,
	IconUser,
	IconCheck,
} from "@tabler/icons-react"
import { Link } from "@tanstack/react-router"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { mockUser } from "@/lib/navigation"
import { useTheme } from "@/hooks/use-theme"

function getInitials(name: string): string {
	return name
		.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase()
		.slice(0, 2)
}

export function UserMenu() {
	const { theme, setTheme } = useTheme()

	return (
		<DropdownMenu>
			<DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-lg p-2 hover:bg-sidebar-accent/50 focus:outline-none">
				<Avatar size="sm">
					{mockUser.avatarUrl && <AvatarImage src={mockUser.avatarUrl} alt={mockUser.name} />}
					<AvatarFallback>{getInitials(mockUser.name)}</AvatarFallback>
				</Avatar>
				<div className="flex-1 text-left">
					<p className="text-sm font-medium text-sidebar-foreground">{mockUser.name}</p>
					<p className="text-xs text-muted-foreground">{mockUser.email}</p>
				</div>
				<IconDotsVertical className="size-4 text-muted-foreground" />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" side="top" className="w-56">
				<DropdownMenuItem asChild>
					<Link to="/settings">
						<IconUser className="mr-2" />
						Profile
					</Link>
				</DropdownMenuItem>
				<DropdownMenuItem asChild>
					<Link to="/settings">
						<IconSettings className="mr-2" />
						Settings
					</Link>
				</DropdownMenuItem>
				<DropdownMenuSub>
					<DropdownMenuSubTrigger>
						{theme === "dark" ? <IconMoon className="mr-2" /> : <IconSun className="mr-2" />}
						Theme
					</DropdownMenuSubTrigger>
					<DropdownMenuSubContent>
						<DropdownMenuItem onClick={() => setTheme("system")}>
							<IconDeviceDesktop className="mr-2" />
							System
							{theme === "system" && <IconCheck className="ml-auto" />}
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => setTheme("light")}>
							<IconSun className="mr-2" />
							Light
							{theme === "light" && <IconCheck className="ml-auto" />}
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => setTheme("dark")}>
							<IconMoon className="mr-2" />
							Dark
							{theme === "dark" && <IconCheck className="ml-auto" />}
						</DropdownMenuItem>
					</DropdownMenuSubContent>
				</DropdownMenuSub>
				<DropdownMenuSeparator />
				<DropdownMenuItem variant="destructive">
					<IconLogout className="mr-2" />
					Sign out
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
