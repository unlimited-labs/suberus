interface Props {
	hasSearch: boolean;
}

export function UnscheduledEmpty({ hasSearch }: Props) {
	return (
		<div className="flex flex-col items-center justify-center gap-1 p-6 text-center">
			{hasSearch ? (
				<p className="text-muted-foreground text-xs">No results</p>
			) : (
				<>
					<p className="text-muted-foreground text-xs font-medium">
						All scheduled
					</p>
					<p className="text-muted-foreground/70 text-[11px]">
						Every accepted submission has been assigned to a session.
					</p>
				</>
			)}
		</div>
	);
}
