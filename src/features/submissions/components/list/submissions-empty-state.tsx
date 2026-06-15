import { IconFileText, IconLock, IconPlus } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/shared/ui/button";

interface SubmissionsEmptyStateProps {
	canSubmit: boolean;
}

export function SubmissionsEmptyState({
	canSubmit,
}: SubmissionsEmptyStateProps) {
	return (
		<div className="rounded-lg border border-border/50 p-8 text-center">
			{canSubmit ? (
				<>
					<IconFileText className="mx-auto size-12 text-muted-foreground/50" />
					<p className="mt-4 text-muted-foreground">
						You don't have any submissions yet
					</p>
					<Link to="/submissions/new">
						<Button className="mt-4 gap-2">
							<IconPlus className="size-4" />
							Create your first submission
						</Button>
					</Link>
				</>
			) : (
				<>
					<IconLock className="mx-auto size-12 text-muted-foreground/50" />
					<p className="mt-4 text-muted-foreground">Submissions are closed</p>
				</>
			)}
		</div>
	);
}
