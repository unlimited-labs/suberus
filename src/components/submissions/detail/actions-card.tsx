import { IconEdit, IconSend, IconX } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { SubmissionStatus } from "@/generated/prisma/enums";
import {
	mySubmissionsQueryOptions,
	submissionDetailQueryOptions,
	submitDraftFn,
} from "@/utils/submissions.functions";
import { withdrawSubmissionFn } from "@/utils/workflow.functions";

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
	const queryClient = useQueryClient();
	const [isLoading, setIsLoading] = useState(false);

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
		} finally {
			setIsLoading(false);
		}
	};

	const handleWithdraw = async () => {
		setIsLoading(true);
		try {
			const result = await withdrawSubmissionFn({
				data: { submissionId },
			});
			if (result.success) {
				toast.success("Submission withdrawn");
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
				toast.error(result.error ?? "Withdraw failed");
			}
		} catch {
			toast.error("Withdraw failed");
		} finally {
			setIsLoading(false);
		}
	};

	const renderActions = () => {
		switch (status) {
			case "DRAFT":
				return (
					<>
						<Button
							variant="outline"
							className="gap-2 w-full"
							onClick={handleEdit}
							disabled={isLoading}
						>
							<IconEdit className="size-4" />
							Continue Editing
						</Button>
						<Button
							className="gap-2 w-full"
							onClick={handleSubmit}
							disabled={isLoading}
						>
							<IconSend className="size-4" />
							Submit
						</Button>
						<Button
							variant="destructive"
							className="gap-2 w-full"
							onClick={handleWithdraw}
							disabled={isLoading}
						>
							<IconX className="size-4" />
							Withdraw Submission
						</Button>
					</>
				);
			case "REVISE_REQUIRED":
				return (
					<>
						<Button className="gap-2 w-full" onClick={handleRevise}>
							<IconEdit className="size-4" />
							Make Revisions
						</Button>
						<Button
							variant="destructive"
							className="gap-2 w-full"
							onClick={handleWithdraw}
							disabled={isLoading}
						>
							<IconX className="size-4" />
							Withdraw Submission
						</Button>
					</>
				);
			case "SUBMITTED":
			case "UNDER_REVIEW":
			case "REVIEWS_COMPLETE":
			case "AWAITING_DECISION":
			case "RESUBMITTED":
				return (
					<Button
						variant="destructive"
						className="gap-2 w-full"
						onClick={handleWithdraw}
						disabled={isLoading}
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
		<div className="rounded-2xl bg-card shadow-xl p-6 border border-border/50">
			{showTitle && (
				<h3 className="font-semibold text-foreground mb-4">Actions</h3>
			)}
			<div className="space-y-2">{actions}</div>
		</div>
	);
}
