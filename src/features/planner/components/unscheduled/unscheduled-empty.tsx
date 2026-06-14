interface Props {
	hasSearch: boolean;
}

export function UnscheduledEmpty({ hasSearch }: Props) {
	return (
		<div className="flex flex-col items-center justify-center gap-1 p-6 text-center">
			{hasSearch ? (
				<p className="text-xs text-muted-foreground">No results</p>
			) : (
				<>
					<p className="text-xs font-medium text-muted-foreground">
						All scheduled
					</p>
					<p className="text-[11px] text-muted-foreground/70">
						Every accepted submission has been assigned to a session.
					</p>
				</>
			)}
		</div>
	);
}
