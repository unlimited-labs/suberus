import { IconPlus } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/shared/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/shared/ui/tooltip";

interface NewSubmissionButtonProps {
	canSubmit: boolean;
	disabledReason: string;
}

export function NewSubmissionButton({
	canSubmit,
	disabledReason,
}: NewSubmissionButtonProps) {
	if (canSubmit) {
		return (
			<Link to="/submissions/new">
				<Button className="gap-2">
					<IconPlus className="size-4" />
					New Submission
				</Button>
			</Link>
		);
	}

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<span
						className="inline-block cursor-not-allowed"
						data-testid="new-submission-disabled"
					>
						<Button className="pointer-events-none gap-2" disabled>
							<IconPlus className="size-4" />
							New Submission
						</Button>
					</span>
				</TooltipTrigger>
				<TooltipContent>{disabledReason}</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
