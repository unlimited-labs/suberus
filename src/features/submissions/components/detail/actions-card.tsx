import { IconEdit, IconSend, IconX } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
	mySubmissionsQueryOptions,
	submissionDetailQueryOptions,
	submitDraftFn,
} from "@/features/submissions/api/submissions";
import type { SubmissionStatus } from "@/generated/prisma/enums";
import { Button } from "@/shared/ui/button";
import { SectionCard } from "@/shared/ui/section-card";
import { WithdrawDialog } from "./withdraw-dialog";

interface ActionsCardProps {
	submissionId: string;
	submissionTitle: string;
	status: SubmissionStatus;
	showTitle?: boolean;
}

export function ActionsCard({
	submissionId,
	submissionTitle,
	status,
	showTitle = true,
}: ActionsCardProps) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [isLoading, setIsLoading] = useState(false);
	const [withdrawOpen, setWithdrawOpen] = useState(false);

	const handleEdit = () =>
		navigate({ to: "/submissions/$id/edit", params: { id: submissionId } });
	const handleRevise = () =>
		navigate({ to: "/submissions/$id/revise", params: { id: submissionId } });

	const handleSubmit = async () => {
		setIsLoading(true);
		try {
			const result = await submitDraftFn({
				data: { submissionId },
			});
			if (result.success) {
				toast.success("Submission submitted");
				await Promise.all([
					queryClient.invalidateQueries({
						queryKey: submissionDetailQueryOptions(submissionId).queryKey,
					}),
					queryClient.invalidateQueries({
						queryKey: mySubmissionsQueryOptions().queryKey,
					}),
				]);
				navigate({ to: "/submissions/$id", params: { id: submissionId } });
			} else {
				toast.error(result.error ?? "Submit failed");
			}
		} catch {
			toast.error("Submit failed");
		}
		setIsLoading(false);
	};

	const renderActions = () => {
		switch (status) {
			case "DRAFT":
				return (
					<>
						<Button
							className="w-full gap-2"
							disabled={isLoading}
							onClick={handleEdit}
							variant="outline"
						>
							<IconEdit className="size-4" />
							Continue Editing
						</Button>
						<Button
							className="w-full gap-2"
							disabled={isLoading}
							onClick={handleSubmit}
						>
							<IconSend className="size-4" />
							Submit
						</Button>
						<Button
							className="w-full gap-2"
							disabled={isLoading}
							onClick={() => setWithdrawOpen(true)}
							variant="destructive"
						>
							<IconX className="size-4" />
							Withdraw Submission
						</Button>
					</>
				);
			case "REVISE_REQUIRED":
				return (
					<>
						<Button className="w-full gap-2" onClick={handleRevise}>
							<IconEdit className="size-4" />
							Make Revisions
						</Button>
						<Button
							className="w-full gap-2"
							disabled={isLoading}
							onClick={() => setWithdrawOpen(true)}
							variant="destructive"
						>
							<IconX className="size-4" />
							Withdraw Submission
						</Button>
					</>
				);
			case "CONDITIONALLY_ACCEPTED":
				return (
					<Button className="w-full gap-2" onClick={handleRevise}>
						<IconEdit className="size-4" />
						Upload Revised Version
					</Button>
				);
			case "SUBMITTED":
			case "UNDER_REVIEW":
			case "REVIEWS_COMPLETE":
			case "AWAITING_DECISION":
			case "RESUBMITTED":
				return (
					<Button
						className="w-full gap-2"
						disabled={isLoading}
						onClick={() => setWithdrawOpen(true)}
						variant="destructive"
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
		<>
			{showTitle ? (
				<SectionCard title="Actions" variant="outlined">
					<div className="space-y-2">{actions}</div>
				</SectionCard>
			) : (
				<div className="bg-card border-border/50 rounded-2xl border p-6 shadow-xl">
					<div className="space-y-2">{actions}</div>
				</div>
			)}
			<WithdrawDialog
				onOpenChange={setWithdrawOpen}
				open={withdrawOpen}
				submissionId={submissionId}
				submissionTitle={submissionTitle}
			/>
		</>
	);
}
