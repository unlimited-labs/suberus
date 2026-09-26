import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
	changeSubmitterFn,
	submissionKeys,
} from "@/features/submissions/api/admin-submissions";
import {
	filterPeople,
	PersonPickerList,
} from "@/features/submissions/components/admin/person-picker-list";
import { adminUsersQueryOptions } from "@/features/users/api/users";
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

const MAX_RESULTS = 20;

interface ChangeSubmitterDialogProps {
	submissionId: string;
	submissionTitle: string;
	currentSubmitterId: string;
	currentSubmitterName: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onChanged?: () => void;
}

export function ChangeSubmitterDialog({
	submissionId,
	submissionTitle,
	currentSubmitterId,
	currentSubmitterName,
	open,
	onOpenChange,
	onChanged,
}: ChangeSubmitterDialogProps) {
	const queryClient = useQueryClient();
	const [search, setSearch] = useState("");
	const [pendingUserId, setPendingUserId] = useState<string | null>(null);

	const { data: users = [], isLoading } = useQuery({
		...adminUsersQueryOptions(),
		enabled: open,
	});

	const rows = users
		.filter((u) => u.isActive && u.id !== currentSubmitterId)
		.map((u) => ({
			id: u.id,
			name: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim(),
			email: u.email,
			affiliation: u.affiliation,
			badges: (
				<Badge className="text-xs" variant="outline">
					{u.role}
				</Badge>
			),
		}));
	const candidates = filterPeople(rows, search).slice(0, MAX_RESULTS);

	async function handleSelect(userId: string) {
		setPendingUserId(userId);
		try {
			const result = await changeSubmitterFn({
				data: { submissionId, userId },
			});
			if (result.success) {
				toast.success("Submitter changed");
				await queryClient.invalidateQueries({
					queryKey: submissionKeys.one(submissionId),
				});
				onChanged?.();
				onOpenChange(false);
			} else {
				toast.error(result.error || "Failed to change submitter");
			}
		} catch (_error) {
			toast.error("Failed to change submitter");
		}
		setPendingUserId(null);
	}

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
				<DialogHeader className="min-w-0">
					<DialogTitle>Change Submitter</DialogTitle>
					<DialogDescription className="truncate">
						{submissionTitle}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-6 py-4">
					<div className="space-y-2">
						<Label className="text-base">Current submitter</Label>
						<p className="text-muted-foreground text-sm">
							{currentSubmitterName}
						</p>
						<p className="text-muted-foreground text-xs">
							The submitter owns this record — it appears among their
							submissions and they receive its reminders. The author list is
							edited separately.
						</p>
					</div>

					<div className="space-y-3">
						<Label className="text-base">New submitter</Label>

						<PersonPickerList
							actionLabel="Make submitter"
							emptyLabel="No users found"
							emptySearchLabel="No users found matching search"
							isLoading={isLoading}
							onSearchChange={setSearch}
							onSelect={handleSelect}
							optionTestId="submitter-option"
							pendingId={pendingUserId}
							rows={candidates}
							search={search}
						/>
					</div>
				</div>

				<DialogFooter>
					<Button onClick={() => onOpenChange(false)} variant="outline">
						Close
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
