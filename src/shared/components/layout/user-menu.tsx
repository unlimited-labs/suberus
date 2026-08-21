import {
	IconBook,
	IconCheck,
	IconDeviceDesktop,
	IconDotsVertical,
	IconExternalLink,
	IconLogout,
	IconMoon,
	IconSun,
	IconUser,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useState } from "react";
import { toast } from "sonner";
import { mcpConnectionQueryOptions } from "@/features/mcp/api/mcp-connection";
import { McpMenuItem } from "@/features/mcp/components/mcp-menu-item";
import { clearOfflineProgramCache } from "@/integrations/tanstack-query/offline";
import { useTheme } from "@/shared/components/theme-provider";
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

// Admin-only and rarely opened: keep it out of every user's layout chunk.
const McpConnectDialog = lazy(() =>
	import("@/features/mcp/components/mcp-connect-dialog").then((m) => ({
		default: m.McpConnectDialog,
	})),
);

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
	const [mcpOpen, setMcpOpen] = useState(false);

	// Fetched here, not in the item: the item mounts only on menu open, so its own
	// query would pop it in. Not useAdminAuth — that hook becomes its own Vite
	// chunk, which e2e/bundle/admin-code-splitting.spec.ts forbids in this layout.
	const { data: mcp } = useQuery({
		...mcpConnectionQueryOptions(),
		enabled: user?.role === "ADMIN" || user?.role === "EDITOR",
		staleTime: 5 * 60 * 1000,
	});

	const handleSignOut = async () => {
		await clearOfflineProgramCache();
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
					className="hover:bg-sidebar-accent/50 flex w-full items-center gap-3 rounded-lg p-2 focus:outline-none"
					data-testid="user-menu-trigger"
				>
					<Avatar size="sm">
						{user.image && <AvatarImage alt={displayName} src={user.image} />}
						<AvatarFallback>
							{getInitials(user.firstName, user.lastName)}
						</AvatarFallback>
					</Avatar>
					<div className="flex-1 text-left">
						<p className="text-sidebar-foreground text-sm font-medium">
							{displayName}
						</p>
					</div>
					<IconDotsVertical className="text-muted-foreground size-4" />
				</DropdownMenuTrigger>
				<DropdownMenuContent
					align="end"
					className="w-56"
					data-testid="user-menu-content"
					side="top"
				>
					<DropdownMenuItem asChild>
						<Link to="/profile">
							<IconUser className="mr-2" />
							Profile
						</Link>
					</DropdownMenuItem>
					{mcp?.enabled && <McpMenuItem onOpen={() => setMcpOpen(true)} />}
					{user.role === "ADMIN" && (
						<DropdownMenuItem asChild>
							<a
								href="https://docs.suberus.app/"
								rel="noopener noreferrer"
								target="_blank"
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
					<DropdownMenuItem onClick={handleSignOut} variant="destructive">
						<IconLogout className="mr-2" />
						Sign out
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
			{mcpOpen && (
				<Suspense fallback={null}>
					<McpConnectDialog onOpenChange={setMcpOpen} open />
				</Suspense>
			)}
		</>
	);
}
