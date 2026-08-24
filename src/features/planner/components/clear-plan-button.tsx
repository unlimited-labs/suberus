import { IconAlertTriangle, IconTrash } from "@tabler/icons-react";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
	clearPlanFn,
	scheduleStateQueryOptions,
} from "@/features/planner/api/schedule";
import { getErrorMessage } from "@/shared/lib/error-message";
import { Button } from "@/shared/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/shared/ui/dialog";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/shared/ui/tooltip";
import { useInvalidatePlannerQueries } from "./hooks/use-invalidate-planner-queries";
import {
	ConfirmPhraseField,
	isConfirmPhrase,
} from "./shared/confirm-phrase-field";

export function ClearPlanButton() {
	const { data: state } = useSuspenseQuery(scheduleStateQueryOptions());
	const invalidate = useInvalidatePlannerQueries();
	const [open, setOpen] = useState(false);
	const [confirmation, setConfirmation] = useState("");

	const isPublished = state.status === "PUBLISHED";

	const mutation = useMutation({
		mutationFn: () => clearPlanFn(),
		onSuccess: () => {
			invalidate();
			setOpen(false);
			toast.success("Plan cleared");
		},
		onError: (error) => {
			toast.error(getErrorMessage(error, "Failed to clear the plan"));
		},
	});

	const openChange = (next: boolean) => {
		if (mutation.isPending) return;
		setConfirmation("");
		setOpen(next);
	};

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<span>
						<Button
							className="border-destructive/40 text-destructive hover:bg-destructive/10 gap-1.5"
							data-testid="clear-plan-button"
							disabled={isPublished}
							onClick={() => openChange(true)}
							size="sm"
							variant="outline"
						>
							<IconTrash size={14} />
							Clear plan
						</Button>
					</span>
				</TooltipTrigger>
				<TooltipContent>
					{isPublished
						? "Unpublish the program before clearing the plan"
						: "Delete every session, assignment, break and event"}
				</TooltipContent>
			</Tooltip>

			<Dialog onOpenChange={openChange} open={open}>
				<DialogContent data-testid="clear-plan-dialog">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<IconAlertTriangle className="text-destructive size-5" />
							Clear plan
						</DialogTitle>
						<DialogDescription>
							Wipe the whole program and start over.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-3 py-2">
						<div className="border-destructive/50 bg-destructive/5 space-y-1 rounded-md border p-3">
							<p className="text-destructive text-sm font-medium">
								This permanently deletes:
							</p>
							<ul className="text-destructive list-disc space-y-1 pl-5 text-sm">
								<li>every session, together with its chairs</li>
								<li>every presentation assignment</li>
								<li>every break and event</li>
								<li>every invited-talk placeholder</li>
							</ul>
						</div>
						<p className="text-muted-foreground text-sm">
							Rooms and tracks are kept. Accepted abstracts return to the
							unscheduled queue. This action cannot be undone.
						</p>
						<ConfirmPhraseField
							onChange={setConfirmation}
							testId="clear-plan-confirm-input"
							value={confirmation}
						/>
					</div>
					<DialogFooter>
						<Button onClick={() => openChange(false)} variant="outline">
							Cancel
						</Button>
						<Button
							data-testid="clear-plan-confirm"
							disabled={!isConfirmPhrase(confirmation) || mutation.isPending}
							onClick={() => mutation.mutate()}
							variant="destructive"
						>
							{mutation.isPending ? "Clearing..." : "Clear plan"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</TooltipProvider>
	);
}
