import {
	IconBell,
	IconCalendar,
	IconCheck,
	IconCloudOff,
	IconDeviceDesktop,
	IconDownload,
	IconExternalLink,
	IconLogin2,
	IconLogout,
	IconMoon,
	IconSun,
	IconUserCircle,
	IconUsers,
} from "@tabler/icons-react";
import { Link, useLocation } from "@tanstack/react-router";
import type { CSSProperties, ReactNode } from "react";
import { clearOfflineProgramCache } from "@/integrations/tanstack-query/offline";
import { useTheme } from "@/shared/components/theme-provider";
import { useSession } from "@/shared/hooks/use-session";
import { authClient } from "@/shared/lib/auth-client";
import type { Theme } from "@/shared/lib/theme";
import { cn } from "@/shared/lib/utils";
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
import { Switch } from "@/shared/ui/switch";
import { useFavoriteNotifications } from "../use-favorite-notifications";
import { useInstallPrompt, useIsOffline } from "../use-program-pwa";

export function ProgramAuthLink({
	className,
	style,
	labelClassName,
}: {
	className?: string;
	style?: CSSProperties;
	labelClassName?: string;
}) {
	const { user, isPending, isAuthenticated } = useSession();
	const notifications = useFavoriteNotifications();
	const { theme, setTheme } = useTheme();
	if (isPending) return null;
	const linkClass = cn("inline-flex items-center gap-1.5", className);
	if (isAuthenticated && user) {
		const name =
			[user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;
		return (
			<DropdownMenu>
				<DropdownMenuTrigger
					aria-label={name}
					className={linkClass}
					data-testid="program-auth-link"
					style={style}
					title={name}
				>
					<IconUserCircle className="size-[1.2em]" />
					<span className={labelClassName}>{name}</span>
				</DropdownMenuTrigger>
				<DropdownMenuContent
					align="end"
					className="w-auto min-w-56"
					data-testid="program-user-menu"
				>
					{notifications.supported && (
						<DropdownMenuItem
							className="justify-between gap-3"
							closeOnClick={false}
							data-testid="program-notifications-item"
							onClick={() => {
								notifications.toggle(!notifications.enabled);
							}}
						>
							<span className="inline-flex items-center gap-2">
								<IconBell className="size-4" />
								Notifications
							</span>
							<Switch
								aria-hidden
								checked={notifications.enabled}
								className="pointer-events-none"
								data-testid="program-notifications-switch"
								tabIndex={-1}
							/>
						</DropdownMenuItem>
					)}
					<DropdownMenuItem asChild data-testid="program-visit-system-item">
						<Link className="gap-2" to="/">
							<IconExternalLink className="size-4" />
							Conference system
						</Link>
					</DropdownMenuItem>
					<DropdownMenuSub>
						<DropdownMenuSubTrigger
							className="gap-2"
							data-testid="program-theme-item"
						>
							<ThemeIcon className="size-4" theme={theme} />
							Theme
						</DropdownMenuSubTrigger>
						<DropdownMenuSubContent>
							<DropdownMenuItem
								className="gap-2"
								data-testid="program-theme-system"
								onClick={() => setTheme("system")}
							>
								<ThemeIcon className="size-4" theme="system" />
								System
								{theme === "system" && <IconCheck className="ml-auto size-4" />}
							</DropdownMenuItem>
							<DropdownMenuItem
								className="gap-2"
								data-testid="program-theme-light"
								onClick={() => setTheme("light")}
							>
								<IconSun className="size-4" />
								Light
								{theme === "light" && <IconCheck className="ml-auto size-4" />}
							</DropdownMenuItem>
							<DropdownMenuItem
								className="gap-2"
								data-testid="program-theme-dark"
								onClick={() => setTheme("dark")}
							>
								<IconMoon className="size-4" />
								Dark
								{theme === "dark" && <IconCheck className="ml-auto size-4" />}
							</DropdownMenuItem>
						</DropdownMenuSubContent>
					</DropdownMenuSub>
					<DropdownMenuSeparator />
					<DropdownMenuItem
						className="gap-2"
						data-testid="program-logout-item"
						onClick={async () => {
							await clearOfflineProgramCache();
							await authClient.signOut();
							window.location.reload();
						}}
					>
						<IconLogout className="size-4" />
						Log out
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		);
	}
	return (
		<Link
			aria-label="Sign in"
			className={linkClass}
			data-testid="program-auth-link"
			style={style}
			title="Sign in"
			to="/login"
		>
			<IconLogin2 className="size-[1.2em]" />
			<span className={labelClassName}>Sign in</span>
		</Link>
	);
}

function ThemeIcon({ theme, className }: { theme: Theme; className?: string }) {
	const Icon =
		theme === "dark"
			? IconMoon
			: theme === "light"
				? IconSun
				: IconDeviceDesktop;
	return <Icon className={className} />;
}

export function ProgramParticipantsLink({
	className,
	labelClassName,
}: {
	className?: string;
	labelClassName?: string;
}) {
	const onList = useLocation({
		select: (l) => l.pathname.replace(/\/$/, "") === "/program/participants",
	});
	const label = onList ? "Programme" : "Participants";
	return (
		<Link
			aria-label={label}
			className={cn("inline-flex items-center gap-1.5", className)}
			data-testid={onList ? "program-back-link" : "program-participants-link"}
			title={label}
			to={onList ? "/program" : "/program/participants"}
		>
			{onList ? (
				<IconCalendar className="size-[1.2em]" />
			) : (
				<IconUsers className="size-[1.2em]" />
			)}
			<span className={labelClassName}>{label}</span>
		</Link>
	);
}

export function Highlight({
	text,
	query,
	markClassName,
}: {
	text: string;
	query: string;
	markClassName?: string;
}) {
	if (!query) return <>{text}</>;
	const haystack = text.toLowerCase();
	const parts: ReactNode[] = [];
	let cursor = 0;
	for (
		let idx = haystack.indexOf(query);
		idx >= 0;
		idx = haystack.indexOf(query, cursor)
	) {
		if (idx > cursor) parts.push(text.slice(cursor, idx));
		parts.push(
			<mark className={cn("px-0.5", markClassName)} key={idx}>
				{text.slice(idx, idx + query.length)}
			</mark>,
		);
		cursor = idx + query.length;
	}
	if (parts.length === 0) return <>{text}</>;
	if (cursor < text.length) parts.push(text.slice(cursor));
	return <>{parts}</>;
}

export function ProgramEmptyState() {
	return (
		<div className="bg-background flex h-screen flex-col items-center justify-center gap-3 p-8 text-center">
			<IconCalendar className="text-muted-foreground size-12" />
			<p className="text-foreground text-2xl font-semibold">
				Programme not published yet
			</p>
			<p className="text-muted-foreground text-sm tracking-[0.25em] uppercase">
				— check back soon —
			</p>
		</div>
	);
}

export function ProgramPwaStatus({ className }: { className?: string }) {
	const offline = useIsOffline();
	const { canInstall, install } = useInstallPrompt();

	if (!offline && !canInstall) return null;

	return (
		<div className={cn("inline-flex items-center gap-3", className)}>
			{offline && (
				<span
					className="text-muted-foreground inline-flex items-center gap-1.5 text-sm"
					data-testid="program-offline-badge"
				>
					<IconCloudOff className="size-4" />
					<span className="hidden sm:inline">Offline</span>
				</span>
			)}
			{canInstall && (
				<button
					className="hover:text-primary inline-flex items-center gap-1.5 text-sm transition-colors"
					data-testid="program-install-button"
					onClick={install}
					type="button"
				>
					<IconDownload className="size-4" />
					<span className="hidden sm:inline">Install</span>
				</button>
			)}
		</div>
	);
}
