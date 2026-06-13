import {
	IconCheck,
	IconChevronDown,
	IconGavel,
	IconLoader2,
	IconTrash,
	IconUsers,
	IconX,
} from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { ActionAvailability, PrimaryAction } from "./availability";
import type { SubmissionDialogKind } from "./detail-dialogs";

interface ActionsCardProps {
	availability: ActionAvailability;
	primaryAction: PrimaryAction | null;
	isTransitioning: boolean;
	onTransition: () => void;
	onOpenDialog: (kind: SubmissionDialogKind) => void;
}

export function ActionsCard({
	availability,
	primaryAction,
	isTransitioning,
	onTransition,
	onOpenDialog,
}: ActionsCardProps) {
	const {
		canAssignReviewers,
		canDeskAccept,
		canDeskReject,
		canTransitionToAwaitingDecision,
		canMakeDecision,
		canConfirmConditions,
		canOverrideDecision,
	} = availability;

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">Actions</CardTitle>
			</CardHeader>
			<CardContent className="space-y-2">
				{primaryAction === "transition" && (
					<Button
						className="w-full"
						onClick={onTransition}
						disabled={isTransitioning}
					>
						{isTransitioning ? (
							<IconLoader2 className="mr-2 size-4 animate-spin" />
						) : (
							<IconGavel className="mr-2 size-4" />
						)}
						Ready for Decision
					</Button>
				)}
				{primaryAction === "decision" && (
					<Button className="w-full" onClick={() => onOpenDialog("decision")}>
						<IconGavel className="mr-2 size-4" />
						Make Decision
					</Button>
				)}
				{primaryAction === "conditions" && (
					<Button
						className="w-full"
						onClick={() => onOpenDialog("confirmConditions")}
					>
						<IconCheck className="mr-2 size-4" />
						Confirm Conditions Met
					</Button>
				)}

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="outline"
							className="w-full justify-between"
							data-testid="submission-actions-trigger"
						>
							{primaryAction ? "More actions" : "Actions"}
							<IconChevronDown className="size-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start">
						{canAssignReviewers && (
							<DropdownMenuItem onSelect={() => onOpenDialog("assign")}>
								<IconUsers className="mr-2 size-4" />
								Assign Reviewer
							</DropdownMenuItem>
						)}
						{canDeskAccept && (
							<DropdownMenuItem onSelect={() => onOpenDialog("deskAccept")}>
								<IconCheck className="mr-2 size-4" />
								Desk Accept
							</DropdownMenuItem>
						)}
						{canDeskReject && (
							<DropdownMenuItem onSelect={() => onOpenDialog("deskReject")}>
								<IconX className="mr-2 size-4" />
								Desk Reject
							</DropdownMenuItem>
						)}
						{canTransitionToAwaitingDecision &&
							primaryAction !== "transition" && (
								<DropdownMenuItem
									onSelect={onTransition}
									disabled={isTransitioning}
								>
									<IconGavel className="mr-2 size-4" />
									Ready for Decision
								</DropdownMenuItem>
							)}
						{canMakeDecision && primaryAction !== "decision" && (
							<DropdownMenuItem onSelect={() => onOpenDialog("decision")}>
								<IconGavel className="mr-2 size-4" />
								Make Decision
							</DropdownMenuItem>
						)}
						{canConfirmConditions && primaryAction !== "conditions" && (
							<DropdownMenuItem
								onSelect={() => onOpenDialog("confirmConditions")}
							>
								<IconCheck className="mr-2 size-4" />
								Confirm Conditions Met
							</DropdownMenuItem>
						)}
						{canOverrideDecision && (
							<DropdownMenuItem onSelect={() => onOpenDialog("override")}>
								<IconGavel className="mr-2 size-4" />
								Override Decision
							</DropdownMenuItem>
						)}
						<DropdownMenuSeparator />
						<DropdownMenuItem
							variant="destructive"
							onSelect={() => onOpenDialog("delete")}
						>
							<IconTrash className="mr-2 size-4" />
							Delete
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</CardContent>
		</Card>
	);
}
