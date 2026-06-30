import { IconCalendar, IconLogin2, IconUserCircle } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import type { CSSProperties } from "react";
import { useSession } from "@/shared/hooks/use-session";
import { cn } from "@/shared/lib/utils";

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
	if (isPending) return null;
	const linkClass = cn("inline-flex items-center gap-1.5", className);
	if (isAuthenticated && user) {
		const name =
			[user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;
		return (
			<Link
				to="/"
				className={linkClass}
				style={style}
				data-testid="program-auth-link"
				aria-label={name}
				title={name}
			>
				<IconUserCircle className="size-[1.2em]" />
				<span className={labelClassName}>{name}</span>
			</Link>
		);
	}
	return (
		<Link
			to="/login"
			className={linkClass}
			style={style}
			data-testid="program-auth-link"
			aria-label="Zaloguj się"
			title="Zaloguj się"
		>
			<IconLogin2 className="size-[1.2em]" />
			<span className={labelClassName}>Zaloguj się</span>
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
