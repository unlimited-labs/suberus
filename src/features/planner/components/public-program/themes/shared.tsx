import {
	IconBell,
	IconCalendar,
	IconCloudOff,
	IconDownload,
	IconExternalLink,
	IconLogin2,
	IconLogout,
	IconUserCircle,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import type { CSSProperties } from "react";
import { clearOfflineProgramCache } from "@/integrations/tanstack-query/offline";
import { useSession } from "@/shared/hooks/use-session";
import { authClient } from "@/shared/lib/auth-client";
import { cn } from "@/shared/lib/utils";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
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
	if (isPending) return null;
	const linkClass = cn("inline-flex items-center gap-1.5", className);
	if (isAuthenticated && user) {
		const name =
			[user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;
		return (
			<DropdownMenu>
				<DropdownMenuTrigger
					className={linkClass}
					style={style}
					data-testid="program-auth-link"
					aria-label={name}
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
							closeOnClick={false}
							onClick={() => {
								notifications.toggle(!notifications.enabled);
							}}
							className="justify-between gap-3"
							data-testid="program-notifications-item"
						>
							<span className="inline-flex items-center gap-2">
								<IconBell className="size-4" />
								Notifications
							</span>
							<Switch
								checked={notifications.enabled}
								aria-hidden
								tabIndex={-1}
								className="pointer-events-none"
								data-testid="program-notifications-switch"
							/>
						</DropdownMenuItem>
					)}
					<DropdownMenuItem asChild data-testid="program-visit-system-item">
						<Link to="/" className="gap-2">
							<IconExternalLink className="size-4" />
							Conference system
						</Link>
					</DropdownMenuItem>
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
			to="/login"
			className={linkClass}
			style={style}
			data-testid="program-auth-link"
			aria-label="Sign in"
			title="Sign in"
		>
			<IconLogin2 className="size-[1.2em]" />
			<span className={labelClassName}>Sign in</span>
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
	const idx = text.toLowerCase().indexOf(query);
	if (idx < 0) return <>{text}</>;
	return (
		<>
			{text.slice(0, idx)}
			<mark className={cn("px-0.5", markClassName)}>
				{text.slice(idx, idx + query.length)}
			</mark>
			{text.slice(idx + query.length)}
		</>
	);
}

export function ProgramEmptyState() {
	return (
		<div className="flex h-screen flex-col items-center justify-center gap-3 bg-background p-8 text-center">
			<IconCalendar className="size-12 text-muted-foreground" />
			<p className="text-2xl font-semibold text-foreground">
				Programme not published yet
			</p>
			<p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">
				— check back soon —
			</p>
		</div>
	);
}

/** Offline indicator + install prompt, shown next to the auth link in both headers. */
export function ProgramPwaStatus({ className }: { className?: string }) {
	const offline = useIsOffline();
	const { canInstall, install } = useInstallPrompt();

	if (!offline && !canInstall) return null;

	return (
		<div className={cn("inline-flex items-center gap-3", className)}>
			{offline && (
				<span
					data-testid="program-offline-badge"
					className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"
				>
					<IconCloudOff className="size-4" />
					<span className="hidden sm:inline">Offline</span>
				</span>
			)}
			{canInstall && (
				<button
					type="button"
					onClick={install}
					data-testid="program-install-button"
					className="inline-flex items-center gap-1.5 text-sm transition-colors hover:text-primary"
				>
					<IconDownload className="size-4" />
					<span className="hidden sm:inline">Install</span>
				</button>
			)}
		</div>
	);
}
