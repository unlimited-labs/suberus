import { IconCalendar } from "@tabler/icons-react";
import { cn } from "@/shared/lib/utils";

interface SubmissionsDeadlineBannerProps {
	formattedDeadline: string;
	urgent: boolean;
	critical: boolean;
}

export function SubmissionsDeadlineBanner({
	formattedDeadline,
	urgent,
	critical,
}: SubmissionsDeadlineBannerProps) {
	return (
		<div
			data-testid="submission-deadline"
			className="flex items-center gap-2 border-b border-border px-6 py-2 text-sm"
		>
			<IconCalendar className="size-4 text-muted-foreground" />
			<span className="text-muted-foreground">Submission deadline:</span>
			<span
				data-testid="submission-deadline-date"
				className={cn(
					"font-medium",
					urgent && "text-red-700 dark:text-red-400",
					critical && "font-bold",
				)}
			>
				{formattedDeadline}
			</span>
		</div>
	);
}
