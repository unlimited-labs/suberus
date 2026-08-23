import {
	IconCircle,
	IconCircleCheck,
	IconMessageCircle,
	IconScale,
	IconStar,
} from "@tabler/icons-react";
import { cn } from "@/shared/lib/utils";
import { Markdown } from "@/shared/ui/markdown";
import { SectionCard } from "@/shared/ui/section-card";

interface ReviewProgress {
	hasDecision: boolean;
	hasScores: boolean;
	hasConfidence: boolean;
	hasComments: boolean;
}

interface ReviewSidebarProps {
	progress: ReviewProgress;
	enableConfidenceLevel: boolean;
	guidelines?: string;
}

export function ReviewSidebar({
	progress,
	enableConfidenceLevel,
	guidelines,
}: ReviewSidebarProps) {
	const { hasDecision, hasScores, hasConfidence, hasComments } = progress;

	return (
		<>
			<div className="hidden lg:block">
				<div className="sticky top-0 space-y-4">
					<SectionCard contentClassName="space-y-4" title="Review Progress">
						<ProgressItem
							completed={hasDecision}
							icon={IconScale}
							label="Decision"
						/>
						<ProgressItem
							completed={hasScores}
							icon={IconStar}
							label="Evaluation Scores"
						/>
						{enableConfidenceLevel && (
							<ProgressItem
								completed={hasConfidence}
								icon={IconCircle}
								label="Confidence Level"
							/>
						)}
						<ProgressItem
							completed={hasComments}
							icon={IconMessageCircle}
							label="Comments"
						/>
					</SectionCard>

					<SectionCard
						contentClassName="text-sm text-muted-foreground"
						title="Review Guidelines"
					>
						{guidelines ? (
							<Markdown content={guidelines} />
						) : (
							<div className="space-y-3">
								<p>• Provide constructive, specific feedback</p>
								<p>• Support claims with evidence from the work</p>
								<p>• Be respectful and professional</p>
								<p>• Consider the work's contribution to the field</p>
								<p>• Minimum 50 characters for comments</p>
							</div>
						)}
					</SectionCard>
				</div>
			</div>

			<div className="lg:hidden">
				<SectionCard
					contentClassName="grid grid-cols-2 gap-3"
					size="sm"
					title={<span className="text-sm">Review Progress</span>}
				>
					<ProgressItem
						compact
						completed={hasDecision}
						icon={IconScale}
						label="Decision"
					/>
					<ProgressItem
						compact
						completed={hasScores}
						icon={IconStar}
						label="Scores"
					/>
					{enableConfidenceLevel && (
						<ProgressItem
							compact
							completed={hasConfidence}
							icon={IconCircle}
							label="Confidence"
						/>
					)}
					<ProgressItem
						compact
						completed={hasComments}
						icon={IconMessageCircle}
						label="Comments"
					/>
				</SectionCard>
			</div>
		</>
	);
}

interface ProgressItemProps {
	label: string;
	completed: boolean;
	icon: React.ComponentType<{ className?: string }>;
	compact?: boolean;
}

function ProgressItem({
	label,
	completed,
	icon: Icon,
	compact = false,
}: ProgressItemProps) {
	if (compact) {
		return (
			<div className="flex items-center gap-2">
				{completed ? (
					<IconCircleCheck className="text-primary size-4 shrink-0" />
				) : (
					<IconCircle className="text-muted-foreground size-4 shrink-0" />
				)}
				<span
					className={cn(
						"text-xs",
						completed ? "text-foreground" : "text-muted-foreground",
					)}
				>
					{label}
				</span>
			</div>
		);
	}

	return (
		<div className="flex items-center gap-3">
			<div
				className={cn(
					"shrink-0 p-2 rounded-md",
					completed ? "bg-primary/10" : "bg-muted",
				)}
			>
				{completed ? (
					<IconCircleCheck className="text-primary size-5" />
				) : (
					<Icon className="text-muted-foreground size-5" />
				)}
			</div>
			<div className="flex-1">
				<p
					className={cn(
						"font-medium text-sm",
						completed ? "text-foreground" : "text-muted-foreground",
					)}
				>
					{label}
				</p>
			</div>
		</div>
	);
}
