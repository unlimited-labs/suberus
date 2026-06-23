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
					<SectionCard title="Review Progress" contentClassName="space-y-4">
						<ProgressItem
							label="Decision"
							completed={hasDecision}
							icon={IconScale}
						/>
						<ProgressItem
							label="Evaluation Scores"
							completed={hasScores}
							icon={IconStar}
						/>
						{enableConfidenceLevel && (
							<ProgressItem
								label="Confidence Level"
								completed={hasConfidence}
								icon={IconCircle}
							/>
						)}
						<ProgressItem
							label="Comments"
							completed={hasComments}
							icon={IconMessageCircle}
						/>
					</SectionCard>

					<SectionCard
						title="Review Guidelines"
						contentClassName="text-sm text-muted-foreground"
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
					size="sm"
					title={<span className="text-sm">Review Progress</span>}
					contentClassName="grid grid-cols-2 gap-3"
				>
					<ProgressItem
						label="Decision"
						completed={hasDecision}
						icon={IconScale}
						compact
					/>
					<ProgressItem
						label="Scores"
						completed={hasScores}
						icon={IconStar}
						compact
					/>
					{enableConfidenceLevel && (
						<ProgressItem
							label="Confidence"
							completed={hasConfidence}
							icon={IconCircle}
							compact
						/>
					)}
					<ProgressItem
						label="Comments"
						completed={hasComments}
						icon={IconMessageCircle}
						compact
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
					<IconCircleCheck className="size-4 text-primary shrink-0" />
				) : (
					<IconCircle className="size-4 text-muted-foreground shrink-0" />
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
					"flex-shrink-0 p-2 rounded-md",
					completed ? "bg-primary/10" : "bg-muted",
				)}
			>
				{completed ? (
					<IconCircleCheck className="size-5 text-primary" />
				) : (
					<Icon className="size-5 text-muted-foreground" />
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
