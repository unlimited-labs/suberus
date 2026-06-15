import {
	IconCircle,
	IconCircleCheck,
	IconMessageCircle,
	IconScale,
	IconStar,
} from "@tabler/icons-react";
import { cn } from "@/shared/lib/utils";
import { Markdown } from "@/shared/ui/markdown";

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
			{/* Progress Sidebar */}
			<div className="hidden lg:block">
				<div className="sticky top-0 space-y-4">
					<div className="rounded-2xl bg-card shadow-2xl overflow-hidden">
						<div className="p-6 border-b border-border">
							<h3 className="font-semibold text-foreground">Review Progress</h3>
						</div>
						<div className="p-6 space-y-4">
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
						</div>
					</div>

					{/* Guidelines Card */}
					<div className="rounded-2xl bg-card shadow-2xl overflow-hidden">
						<div className="p-6 border-b border-border">
							<h3 className="font-semibold text-foreground">
								Review Guidelines
							</h3>
						</div>
						<div className="p-6 text-sm text-muted-foreground">
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
						</div>
					</div>
				</div>
			</div>

			{/* Mobile Progress */}
			<div className="lg:hidden">
				<div className="rounded-2xl bg-card shadow-2xl overflow-hidden">
					<div className="p-4 border-b border-border">
						<h3 className="font-semibold text-foreground text-sm">
							Review Progress
						</h3>
					</div>
					<div className="p-4 grid grid-cols-2 gap-3">
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
					</div>
				</div>
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
