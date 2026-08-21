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
			className="border-border flex items-center gap-2 border-b px-6 py-2 text-sm"
			data-testid="submission-deadline"
		>
			<IconCalendar className="text-muted-foreground size-4" />
			<span className="text-muted-foreground">Submission deadline:</span>
			<span
				className={cn(
					"font-medium",
					urgent && "text-red-700 dark:text-red-400",
					critical && "font-bold",
				)}
				data-testid="submission-deadline-date"
			>
				{formattedDeadline}
			</span>
		</div>
	);
}
