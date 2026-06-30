import {
	IconBell,
	IconCalendar,
	IconExternalLink,
	IconLogin2,
	IconLogout,
	IconUserCircle,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import type { CSSProperties } from "react";
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
				<DropdownMenuContent align="end" data-testid="program-user-menu">
					{notifications.supported && (
						<DropdownMenuItem
							onSelect={(e) => e.preventDefault()}
							className="justify-between gap-3"
							data-testid="program-notifications-item"
						>
							<span className="inline-flex items-center gap-2">
								<IconBell className="size-4" />
								Notifications
							</span>
							<Switch
								checked={notifications.enabled}
								disabled={notifications.busy}
								onCheckedChange={notifications.toggle}
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
						onSelect={async () => {
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
