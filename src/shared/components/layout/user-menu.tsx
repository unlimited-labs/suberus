import {
	IconBook,
	IconCheck,
	IconDeviceDesktop,
	IconDotsVertical,
	IconExternalLink,
	IconLogout,
	IconMoon,
	IconPlug,
	IconSun,
	IconUser,
} from "@tabler/icons-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { McpConnectDialog } from "@/features/mcp/components/mcp-connect-dialog";
import { useTheme } from "@/shared/components/theme-provider";
import { useAdminAuth } from "@/shared/hooks/use-admin-auth";
import { useSession } from "@/shared/hooks/use-session";
import { signOut } from "@/shared/lib/auth-client";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

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
	const { isAdmin } = useAdminAuth();
	const [mcpOpen, setMcpOpen] = useState(false);

	const handleSignOut = async () => {
		await signOut();
		toast.success("Signed out successfully");
		navigate({ to: "/login" });
	};

	if (!user) return null;

	const displayName =
		[user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger
					data-testid="user-menu-trigger"
					className="flex w-full items-center gap-3 rounded-lg p-2 hover:bg-sidebar-accent/50 focus:outline-none"
				>
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
					{isAdmin && (
						<DropdownMenuItem
							onClick={() => setMcpOpen(true)}
							data-testid="user-menu-mcp"
						>
							<IconPlug className="mr-2" />
							Connect AI assistant
						</DropdownMenuItem>
					)}
					{user.role === "ADMIN" && (
						<DropdownMenuItem asChild>
							<a
								href="https://docs.suberus.app/"
								target="_blank"
								rel="noopener noreferrer"
							>
								<IconBook className="mr-2" />
								Documentation
								<IconExternalLink className="ml-auto size-3.5 opacity-60" />
							</a>
						</DropdownMenuItem>
					)}
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
			<McpConnectDialog open={mcpOpen} onOpenChange={setMcpOpen} />
		</>
	);
}
