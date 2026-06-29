import {
	IconCircle,
	IconCircleCheck,
	IconInfoCircle,
} from "@tabler/icons-react";
import { cn } from "@/shared/lib/utils";
import { Markdown } from "@/shared/ui/markdown";
import { SectionCard } from "@/shared/ui/section-card";
import type { ValidationSettings } from "./submission-form-types";
import type { SubmissionProgress } from "./submission-progress";

interface ProgressRowProps {
	done: boolean;
	label: string;
}

function ProgressRow({ done, label }: ProgressRowProps) {
	return (
		<div
			className="flex items-center gap-3"
			data-testid={`progress-row-${label.toLowerCase().replace(/\s+/g, "-")}`}
		>
			{done ? (
				<IconCircleCheck className="size-5 text-primary" />
			) : (
				<IconCircle className="size-5 text-muted-foreground" />
			)}
			<span
				className={cn(
					"text-sm",
					done ? "text-foreground" : "text-muted-foreground",
				)}
			>
				{label}
			</span>
		</div>
	);
}

interface SubmissionProgressSidebarProps {
	progress: SubmissionProgress;
	validationSettings: ValidationSettings;
	isFileFormat: boolean;
	allowedExtensions: string[];
	renderedGuidelines: string | null;
}

export function SubmissionProgressSidebar({
	progress,
	validationSettings,
	isFileFormat,
	allowedExtensions,
	renderedGuidelines,
}: SubmissionProgressSidebarProps) {
	return (
		<div className="hidden lg:block">
			<div className="sticky space-y-4">
				<SectionCard title="Progress" variant="outlined">
					<div className="space-y-3">
						<ProgressRow done={progress.hasType} label="Submission Type" />
						<ProgressRow done={progress.hasContent} label="Content" />
						<ProgressRow done={progress.hasAuthors} label="Authors" />
						{validationSettings.enableKeywords && (
							<ProgressRow done={progress.hasKeywords} label="Keywords" />
						)}
					</div>
				</SectionCard>

				<SectionCard
					title="Guidelines"
					icon={IconInfoCircle}
					variant="outlined"
				>
					{renderedGuidelines ? (
						<Markdown
							content={renderedGuidelines}
							className="text-sm text-muted-foreground"
						/>
					) : (
						<div className="space-y-3 text-sm text-muted-foreground">
							<p>Title should be concise and descriptive</p>
							{isFileFormat ? (
								<p>
									Upload your document as{" "}
									{allowedExtensions.map((e) => e.toUpperCase()).join(", ")}
								</p>
							) : (
								<p>
									Abstract minimum {validationSettings.minAbstractLength}{" "}
									characters
								</p>
							)}
							<p>At least one author required</p>
							{validationSettings.enableKeywords && (
								<p>
									Add {validationSettings.minKeywords}-
									{validationSettings.maxKeywords} relevant keywords
								</p>
							)}
						</div>
					)}
				</SectionCard>
			</div>
		</div>
	);
}
