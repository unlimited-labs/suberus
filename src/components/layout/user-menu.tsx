import {
	IconCheck,
	IconDeviceDesktop,
	IconDotsVertical,
	IconLogout,
	IconMoon,
	IconSun,
	IconUser,
} from "@tabler/icons-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useTheme } from "@/components/theme-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession } from "@/hooks/use-session";
import { signOut } from "@/lib/auth-client";

function getInitials(
	firstName: string | null,
	lastName: string | null,
): string {
	const first = firstName?.[0] ?? "";
	const last = lastName?.[0] ?? "";
	return (first + last).toUpperCase() || "?";
}

export function UserMenu() {
	const navigate = useNavigate();
	const { theme, setTheme } = useTheme();
	const { user } = useSession();

	const handleSignOut = async () => {
		await signOut();
		toast.success("Signed out successfully");
		navigate({ to: "/login" });
	};

	if (!user) return null;

	const displayName =
		[user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-lg p-2 hover:bg-sidebar-accent/50 focus:outline-none">
				<Avatar size="sm">
					{user.image && <AvatarImage src={user.image} alt={displayName} />}
					<AvatarFallback>
						{getInitials(user.firstName, user.lastName)}
					</AvatarFallback>
				</Avatar>
				<div className="flex-1 text-left">
					<p className="text-sm font-medium text-sidebar-foreground">
						{displayName}
					</p>
					<p className="text-xs text-muted-foreground">{user.email}</p>
				</div>
				<IconDotsVertical className="size-4 text-muted-foreground" />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" side="top" className="w-56">
				<DropdownMenuItem asChild>
					<Link to="/profile">
						<IconUser className="mr-2" />
						Profile
					</Link>
				</DropdownMenuItem>
				<DropdownMenuSub>
					<DropdownMenuSubTrigger>
						{theme === "dark" ? (
							<IconMoon className="mr-2" />
						) : (
							<IconSun className="mr-2" />
						)}
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
				<DropdownMenuItem variant="destructive" onClick={handleSignOut}>
					<IconLogout className="mr-2" />
					Sign out
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
