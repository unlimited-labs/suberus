import {
	IconAlertCircle,
	IconCheck,
	IconCircleCheck,
	IconLoader2,
	IconX,
} from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";
import { useWebMCP } from "use-webmcp-tool";
import { z } from "zod";
import { reviewDecisionColors } from "@/features/submissions/labels";
import { submitEditorDecisionFn } from "@/features/workflow/api/workflow";
import { editorDecisionInput } from "@/features/workflow/validations";
import { lookup } from "@/shared/lib/lookup";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/shared/ui/dialog";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";

interface EditorDecisionDialogProps {
	submissionId: string;
	submissionTitle: string;
	reviews?: Array<{
		reviewerName: string;
		decision: string;
		comments: string | null;
	}>;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onDecisionMade?: () => void;
	canDecide: boolean;
}

const DECISION_TOOL_SCHEMA = z.toJSONSchema(editorDecisionInput);

const decisionOptions = [
	{
		value: "ACCEPT" as const,
		label: "Accept",
		description: "Accept for publication/presentation",
		icon: IconCheck,
		colorClass: "border-green-500 bg-green-500/10 text-green-700",
	},
	{
		value: "CONDITIONALLY_ACCEPT" as const,
		label: "Conditionally Accept",
		description: "Accept with minor conditions",
		icon: IconCircleCheck,
		colorClass: "border-blue-500 bg-blue-500/10 text-blue-700",
	},
	{
		value: "REVISE_AND_RESUBMIT" as const,
		label: "Revise & Resubmit",
		description: "Requires significant revisions",
		icon: IconAlertCircle,
		colorClass: "border-amber-500 bg-amber-500/10 text-amber-700",
	},
	{
		value: "REJECT" as const,
		label: "Reject",
		description: "Does not meet standards",
		icon: IconX,
		colorClass: "border-red-500 bg-red-500/10 text-red-700",
	},
];

export function EditorDecisionDialog({
	submissionId,
	submissionTitle,
	reviews = [],
	open,
	onOpenChange,
	onDecisionMade,
	canDecide,
}: EditorDecisionDialogProps) {
	const [selectedDecision, setSelectedDecision] = useState<
		(typeof decisionOptions)[number]["value"] | null
	>(null);
	const [reasoning, setReasoning] = useState("");
	const [letterToAuthor, setLetterToAuthor] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	useWebMCP({
		name: "prepare-editor-decision",
		description:
			"Opens the editor-decision form for this submission filled in, for the user to review and submit. Use when the user has decided the outcome of the submission.",
		inputSchema: DECISION_TOOL_SCHEMA,
		enabled: canDecide,
		execute: (args) => {
			const parsed = editorDecisionInput.safeParse(args);
			if (!parsed.success) return { error: z.prettifyError(parsed.error) };
			setSelectedDecision(parsed.data.decision);
			setReasoning(parsed.data.reasoning ?? "");
			setLetterToAuthor(parsed.data.letterToAuthor ?? "");
			onOpenChange(true);
			return "The decision form is open and filled in. Nothing is submitted until the user clicks Submit Decision.";
		},
	});

	const handleSubmit = async () => {
		if (!selectedDecision) {
			toast.error("Please select a decision");
			return;
		}

		setIsSubmitting(true);
		try {
			const result = await submitEditorDecisionFn({
				data: {
					submissionId,
					decision: selectedDecision,
					reasoning: reasoning || undefined,
					letterToAuthor: letterToAuthor || undefined,
				},
			});

			if (result.success) {
				toast.success("Decision submitted successfully");
				onOpenChange(false);
				onDecisionMade?.();
				setSelectedDecision(null);
				setReasoning("");
				setLetterToAuthor("");
			} else {
				toast.error(result.error || "Failed to submit decision");
			}
		} catch (_error) {
			toast.error("Failed to submit decision");
		}
		setIsSubmitting(false);
	};

	const handleOpenChange = (isOpen: boolean) => {
		if (!isOpen) {
			setSelectedDecision(null);
			setReasoning("");
			setLetterToAuthor("");
		}
		onOpenChange(isOpen);
	};

	return (
		<Dialog onOpenChange={handleOpenChange} open={open}>
			<DialogContent className="sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>Editor Decision</DialogTitle>
					<DialogDescription className="truncate">
						{submissionTitle}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-6 py-4">
					{reviews.length > 0 && (
						<div className="space-y-3">
							<Label className="text-base">Reviewer Recommendations</Label>
							<div className="max-h-48 space-y-2 overflow-y-auto">
								{reviews.map((review) => (
									<div
										className="space-y-2 rounded-lg border p-3"
										key={review.reviewerName}
									>
										<div className="flex items-center justify-between">
											<span className="text-sm font-medium">
												{review.reviewerName}
											</span>
											<Badge
												className={lookup(
													reviewDecisionColors,
													review.decision,
												)}
												variant="outline"
											>
												{review.decision.replace(/_/g, " ")}
											</Badge>
										</div>
										{review.comments && (
											<p className="text-muted-foreground line-clamp-2 text-sm">
												{review.comments}
											</p>
										)}
									</div>
								))}
							</div>
						</div>
					)}

					<div className="space-y-3">
						<Label className="text-base">Your Decision</Label>
						<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
							{decisionOptions.map((option) => {
								const Icon = option.icon;
								const isSelected = selectedDecision === option.value;
								return (
									<button
										className={cn(
											"flex flex-col gap-2 p-4 rounded-lg border-2 transition-all text-left",
											isSelected
												? option.colorClass
												: "border-border hover:border-primary/50",
										)}
										key={option.value}
										onClick={() => setSelectedDecision(option.value)}
										type="button"
									>
										<div className="flex items-center gap-2">
											<Icon className="size-5" />
											<span className="font-medium">{option.label}</span>
										</div>
										<p className="text-muted-foreground text-xs">
											{option.description}
										</p>
									</button>
								);
							})}
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="reasoning">
							Internal Reasoning{" "}
							<span className="text-muted-foreground font-normal">
								(not visible to authors)
							</span>
						</Label>
						<Textarea
							id="reasoning"
							onChange={(e) => setReasoning(e.target.value)}
							placeholder="Explain your decision rationale..."
							rows={3}
							value={reasoning}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="letter">
							Letter to Author{" "}
							<span className="text-muted-foreground font-normal">
								(optional)
							</span>
						</Label>
						<Textarea
							id="letter"
							onChange={(e) => setLetterToAuthor(e.target.value)}
							placeholder="Compose a message to the author(s)..."
							rows={4}
							value={letterToAuthor}
						/>
					</div>
				</div>

				<DialogFooter>
					<Button
						disabled={isSubmitting}
						onClick={() => onOpenChange(false)}
						variant="outline"
					>
						Cancel
					</Button>
					<Button
						disabled={!selectedDecision || isSubmitting}
						onClick={handleSubmit}
					>
						{isSubmitting && (
							<IconLoader2 className="mr-2 size-4 animate-spin" />
						)}
						Submit Decision
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
