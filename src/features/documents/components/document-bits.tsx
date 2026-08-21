import { IconFileCertificate } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import {
	PLACEHOLDER_LABELS,
	type PlaceholderKey,
} from "@/features/documents/lib/placeholders";
import type { DocumentStatus } from "@/generated/prisma/enums";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/badge";

/** Shown in generate dialogs when the conference has no templates yet. */
export function NoTemplatesHint() {
	return (
		<p className="text-muted-foreground text-xs">
			No templates yet.{" "}
			<Link
				className="text-primary font-medium hover:underline"
				search={{ tab: "templates" }}
				to="/admin/documents"
			>
				Upload one in Documents → Templates
			</Link>{" "}
			first.
		</p>
	);
}

export function PlaceholderChips({ placeholders }: { placeholders: string[] }) {
	if (placeholders.length === 0) {
		return (
			<span className="text-muted-foreground text-xs">No placeholders</span>
		);
	}
	return (
		<div className="flex flex-wrap gap-1">
			{placeholders.map((p) => (
				<Badge className="font-mono text-[10px]" key={p} variant="outline">
					{`{${p}}`}
				</Badge>
			))}
		</div>
	);
}

export function placeholderLabel(key: string): string {
	// SAFETY: an unknown key falls through to the ?? default.
	return PLACEHOLDER_LABELS[key as PlaceholderKey] ?? key;
}

/**
 * Single source of truth for per-status colour: the icon tile, the inline
 * dot, and the soft badge. Status is never conveyed by colour alone — the
 * label and dot always accompany it (a11y).
 */
interface StatusAccent {
	label: string;
	/** Icon-tile background + foreground. */
	tile: string;
	/** Inline status dot colour. */
	dot: string;
	/** Soft badge background + text. */
	badge: string;
	/** Subtle pulse while work is in flight. */
	pulse?: boolean;
}

export const STATUS_ACCENT = {
	PENDING: {
		label: "Generating…",
		tile: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
		dot: "bg-amber-500",
		badge:
			"border-transparent bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
		pulse: true,
	},
	READY: {
		label: "Ready",
		tile: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
		dot: "bg-emerald-500",
		badge:
			"border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
		pulse: false,
	},
	FAILED: {
		label: "Failed",
		tile: "bg-destructive/10 text-destructive",
		dot: "bg-destructive",
		badge: "border-transparent bg-destructive/10 text-destructive",
		pulse: false,
	},
} satisfies Record<DocumentStatus, StatusAccent>;

export function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
	const accent = STATUS_ACCENT[status];
	return (
		<Badge className={accent.badge} data-testid={`doc-status-${status}`}>
			<span
				className={cn(
					"size-1.5 rounded-full",
					accent.dot,
					accent.pulse && "animate-pulse",
				)}
			/>
			{accent.label}
		</Badge>
	);
}

/**
 * Rounded icon tile fronting a document/template card. Colour follows the
 * document status; omit `status` for the neutral (template) treatment.
 */
export function DocumentIconTile({
	status,
	className,
}: {
	status?: DocumentStatus;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"flex size-11 shrink-0 items-center justify-center rounded-xl",
				status ? STATUS_ACCENT[status].tile : "bg-muted text-muted-foreground",
				className,
			)}
		>
			<IconFileCertificate className="size-5" />
		</div>
	);
}

export function formatBytes(bytes: number | null | undefined): string {
	if (!bytes) return "—";
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
