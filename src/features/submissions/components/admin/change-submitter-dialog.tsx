import { IconLoader2, IconSearch, IconUser } from "@tabler/icons-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
	changeSubmitterFn,
	submissionKeys,
} from "@/features/submissions/api/admin-submissions";
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
import { Input } from "@/shared/ui/input";
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

	const term = search.toLowerCase();
	const candidates = users
		.filter((u) => u.isActive && u.id !== currentSubmitterId)
		.filter((u) => {
			const name = `${u.firstName ?? ""} ${u.lastName ?? ""}`.toLowerCase();
			return (
				name.includes(term) ||
				u.email.toLowerCase().includes(term) ||
				(u.affiliation?.toLowerCase().includes(term) ?? false)
			);
		})
		.slice(0, MAX_RESULTS);

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

						<div className="relative">
							<IconSearch className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
							<Input
								className="pl-10"
								onChange={(e) => setSearch(e.target.value)}
								placeholder="Search by name, email, or affiliation..."
								value={search}
							/>
						</div>

						{isLoading ? (
							<div className="flex items-center justify-center py-8">
								<IconLoader2 className="text-muted-foreground size-6 animate-spin" />
							</div>
						) : candidates.length === 0 ? (
							<p className="text-muted-foreground py-4 text-center text-sm">
								{search ? "No users found matching search" : "No users found"}
							</p>
						) : (
							<div className="max-h-64 space-y-2 overflow-y-auto">
								{candidates.map((user) => (
									<div
										className="hover:bg-muted/50 flex items-center justify-between rounded-lg border p-3"
										data-testid="submitter-option"
										key={user.id}
									>
										<div className="min-w-0 flex-1">
											<div className="flex items-center gap-2">
												<IconUser className="text-muted-foreground size-4 shrink-0" />
												<span className="truncate font-medium">
													{user.firstName} {user.lastName}
												</span>
												<Badge className="text-xs" variant="outline">
													{user.role}
												</Badge>
											</div>
											<p className="text-muted-foreground truncate pl-6 text-sm">
												{user.email}
											</p>
											{user.affiliation && (
												<p className="text-muted-foreground truncate pl-6 text-xs">
													{user.affiliation}
												</p>
											)}
										</div>
										<Button
											disabled={pendingUserId !== null}
											onClick={() => handleSelect(user.id)}
											size="sm"
										>
											{pendingUserId === user.id ? (
												<IconLoader2 className="size-4 animate-spin" />
											) : (
												"Make submitter"
											)}
										</Button>
									</div>
								))}
							</div>
						)}
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
