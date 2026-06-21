import {
	IconCheck,
	IconChevronDown,
	IconGavel,
	IconLoader2,
	IconTrash,
} from "@tabler/icons-react";
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
	availability,
	primaryAction,
	isTransitioning,
	onTransition,
	onOpenDialog,
}: ActionsCardProps) {
	const secondaryActions = buildSecondaryActions(availability, primaryAction);

	return (
		<SectionCard title="Actions" contentClassName="space-y-2">
			{primaryAction && (
				<PrimaryActionButton
					primaryAction={primaryAction}
					isTransitioning={isTransitioning}
					onTransition={onTransition}
					onOpenDialog={onOpenDialog}
				/>
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
					{secondaryActions.map(({ id, label, icon: Icon, select }) => (
						<DropdownMenuItem
							key={id}
							onSelect={
								select.type === "transition"
									? onTransition
									: () => onOpenDialog(select.kind)
							}
							disabled={
								select.type === "transition" ? isTransitioning : undefined
							}
						>
							<Icon className="mr-2 size-4" />
							{label}
						</DropdownMenuItem>
					))}
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
		</SectionCard>
	);
}
