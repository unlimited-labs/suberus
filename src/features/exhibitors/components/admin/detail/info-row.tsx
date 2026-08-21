export function InfoRow({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
			<span className="text-muted-foreground w-32 shrink-0">{label}</span>
			<span className="min-w-0 break-words">{children}</span>
		</div>
	);
}

export const notProvided = (
	<span className="text-muted-foreground">Not provided</span>
);
