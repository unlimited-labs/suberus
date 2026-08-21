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
		<div className="border-border/50 rounded-lg border p-8 text-center">
			{canSubmit ? (
				<>
					<IconFileText className="text-muted-foreground/50 mx-auto size-12" />
					<p className="text-muted-foreground mt-4">
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
					<IconLock className="text-muted-foreground/50 mx-auto size-12" />
					<p className="text-muted-foreground mt-4">Submissions are closed</p>
				</>
			)}
		</div>
	);
}
