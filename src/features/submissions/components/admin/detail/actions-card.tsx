import {
	IconCheck,
	IconChevronDown,
	IconGavel,
	IconLoader2,
	IconPencil,
	IconTrash,
	IconUserShare,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useAdminAuth } from "@/shared/hooks/use-admin-auth";
import { Button } from "@/shared/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { SectionCard } from "@/shared/ui/section-card";
import { buildSecondaryActions } from "./actions-card-items";
import type { ActionAvailability, PrimaryAction } from "./availability";
import type { SubmissionDialogKind } from "./detail-dialogs";

interface ActionsCardProps {
	submissionId: string;
	availability: ActionAvailability;
	primaryAction: PrimaryAction | null;
	isTransitioning: boolean;
	onTransition: () => void;
	onOpenDialog: (kind: SubmissionDialogKind) => void;
}

interface PrimaryActionButtonProps {
	primaryAction: PrimaryAction;
	isTransitioning: boolean;
	onTransition: () => void;
	onOpenDialog: (kind: SubmissionDialogKind) => void;
}

function PrimaryActionButton({
	primaryAction,
	isTransitioning,
	onTransition,
	onOpenDialog,
}: PrimaryActionButtonProps) {
	if (primaryAction === "transition") {
		return (
			<Button
				className="w-full"
				disabled={isTransitioning}
				onClick={onTransition}
			>
				{isTransitioning ? (
					<IconLoader2 className="mr-2 size-4 animate-spin" />
				) : (
					<IconGavel className="mr-2 size-4" />
				)}
				Ready for Decision
			</Button>
		);
	}
	if (primaryAction === "decision") {
		return (
			<Button className="w-full" onClick={() => onOpenDialog("decision")}>
				<IconGavel className="mr-2 size-4" />
				Make Decision
			</Button>
		);
	}
	return (
		<Button
			className="w-full"
			onClick={() => onOpenDialog("confirmConditions")}
		>
			<IconCheck className="mr-2 size-4" />
			Confirm Conditions Met
		</Button>
	);
}

export function ActionsCard({
	submissionId,
	availability,
	primaryAction,
	isTransitioning,
	onTransition,
	onOpenDialog,
}: ActionsCardProps) {
	const secondaryActions = buildSecondaryActions(availability, primaryAction);
	const { isOnlyAdmin } = useAdminAuth();

	return (
		<SectionCard contentClassName="space-y-2" title="Actions">
			{primaryAction && (
				<PrimaryActionButton
					isTransitioning={isTransitioning}
					onOpenDialog={onOpenDialog}
					onTransition={onTransition}
					primaryAction={primaryAction}
				/>
			)}

			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						className="w-full justify-between"
						data-testid="submission-actions-trigger"
						variant="outline"
					>
						{primaryAction ? "More actions" : "Actions"}
						<IconChevronDown className="size-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="start">
					{secondaryActions.map(({ id, label, icon: Icon, select }) => (
						<DropdownMenuItem
							disabled={
								select.type === "transition" ? isTransitioning : undefined
							}
							key={id}
							onClick={
								select.type === "transition"
									? onTransition
									: () => onOpenDialog(select.kind)
							}
						>
							<Icon className="mr-2 size-4" />
							{label}
						</DropdownMenuItem>
					))}
					<DropdownMenuSeparator />
					{availability.canChangeSubmitter && (
						<DropdownMenuItem
							data-testid="submission-change-submitter-action"
							onClick={() => onOpenDialog("changeSubmitter")}
						>
							<IconUserShare className="mr-2 size-4" />
							Change submitter
						</DropdownMenuItem>
					)}
					{isOnlyAdmin && (
						<DropdownMenuItem asChild>
							<Link
								data-testid="submission-edit-action"
								params={{ id: submissionId }}
								to="/admin/submissions/$id/edit"
							>
								<IconPencil className="mr-2 size-4" />
								Edit submission
							</Link>
						</DropdownMenuItem>
					)}
					<DropdownMenuItem
						onClick={() => onOpenDialog("delete")}
						variant="destructive"
					>
						<IconTrash className="mr-2 size-4" />
						Delete
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</SectionCard>
	);
}
