import { IconEdit, IconSend, IconX } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import type { SubmissionStatus } from "@/generated/prisma/enums";

interface ActionsCardProps {
	submissionId: string;
	status: SubmissionStatus;
	showTitle?: boolean;
}

export function ActionsCard({
	submissionId,
	status,
	showTitle = true,
}: ActionsCardProps) {
	const navigate = useNavigate();

	const handleEdit = () => navigate({ to: "/submissions/new" });
	const handleSubmit = () => console.log("Submit:", submissionId);
	const handleWithdraw = () => console.log("Withdraw:", submissionId);

	const renderActions = () => {
		switch (status) {
			case "DRAFT":
				return (
					<>
						<Button
							variant="outline"
							className="gap-2 w-full"
							onClick={handleEdit}
						>
							<IconEdit className="size-4" />
							Continue Editing
						</Button>
						<Button className="gap-2 w-full" onClick={handleSubmit}>
							<IconSend className="size-4" />
							Submit
						</Button>
					</>
				);
			case "REVISE_REQUIRED":
				return (
					<Button className="gap-2 w-full" onClick={handleEdit}>
						<IconEdit className="size-4" />
						Make Revisions
					</Button>
				);
			case "SUBMITTED":
				return (
					<>
						<Button
							variant="outline"
							className="gap-2 w-full"
							onClick={handleEdit}
						>
							<IconEdit className="size-4" />
							Edit Submission
						</Button>
						<Button
							variant="destructive"
							className="gap-2 w-full"
							onClick={handleWithdraw}
						>
							<IconX className="size-4" />
							Withdraw Submission
						</Button>
					</>
				);
			case "UNDER_REVIEW":
			case "REVIEWS_COMPLETE":
			case "AWAITING_DECISION":
			case "RESUBMITTED":
				return (
					<Button
						variant="destructive"
						className="gap-2 w-full"
						onClick={handleWithdraw}
					>
						<IconX className="size-4" />
						Withdraw Submission
					</Button>
				);
			default:
				return null;
		}
	};

	const actions = renderActions();
	if (!actions) return null;

	return (
		<div className="rounded-2xl bg-card shadow-xl p-6 border">
			{showTitle && (
				<h3 className="font-semibold text-foreground mb-4">Actions</h3>
			)}
			<div className="space-y-2">{actions}</div>
		</div>
	);
}
