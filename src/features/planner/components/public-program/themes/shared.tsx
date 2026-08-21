import {
	IconBell,
	IconCalendar,
	IconCloudOff,
	IconDownload,
	IconExternalLink,
	IconLogin2,
	IconLogout,
	IconUserCircle,
	IconUsers,
} from "@tabler/icons-react";
import { Link, useLocation } from "@tanstack/react-router";
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

/** Offline indicator + install prompt, shown next to the auth link in both headers. */
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
