import {
	IconClockPlus,
	IconClockX,
	IconDotsVertical,
	IconEdit,
	IconTrash,
	IconUserCheck,
	IconUserCog,
	IconUserX,
} from "@tabler/icons-react";
import { roleLabels } from "@/features/users/labels";
import type { AdminUserDetail } from "@/features/users/server/users";
import { titleLabels } from "@/shared/lib/labels/title";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardHeader, CardTitle } from "@/shared/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

interface UserDetailHeaderProps {
	user: AdminUserDetail;
	canEditProfiles: boolean;
	canChangeThisRole: boolean;
	canDeleteUsers: boolean;
	isPending: boolean;
	onEdit: () => void;
	onChangeRole: () => void;
	onToggleActive: () => void;
	onToggleLateSubmission: () => void;
	onDelete: () => void;
}

/** First+last initials for the avatar fallback, falling back to the email. */
function userInitials(user: AdminUserDetail): string {
	const initials =
		`${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.trim();
	return (initials || user.email[0] || "?").toUpperCase();
}

export function UserDetailHeader({
	user,
	canEditProfiles,
	canChangeThisRole,
	canDeleteUsers,
	isPending,
	onEdit,
	onChangeRole,
	onToggleActive,
	onToggleLateSubmission,
	onDelete,
}: UserDetailHeaderProps) {
	return (
		<Card>
			<CardHeader className="flex flex-row items-start justify-between gap-4">
				<div className="flex items-center gap-3">
					<Avatar size="lg">
						<AvatarFallback>{userInitials(user)}</AvatarFallback>
					</Avatar>
					<div className="flex flex-col gap-1">
						<CardTitle className="text-xl">
							{user.title && `${titleLabels[user.title] ?? user.title} `}
							{user.firstName} {user.lastName}
						</CardTitle>
						<div className="flex items-center gap-2">
							<Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>
								{roleLabels[user.role]}
							</Badge>
							{!user.isActive && <Badge variant="destructive">Inactive</Badge>}
							{user.allowLateSubmission && (
								<Badge variant="outline">Late submission</Badge>
							)}
						</div>
					</div>
				</div>
				<div>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="outline" size="icon-sm">
								<IconDotsVertical className="size-4" />
								<span className="sr-only">Actions menu</span>
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-56">
							{canEditProfiles && (
								<DropdownMenuItem onClick={onEdit}>
									<IconEdit className="mr-2 size-4" />
									Edit Profile
								</DropdownMenuItem>
							)}
							{canChangeThisRole && (
								<DropdownMenuItem onClick={onChangeRole}>
									<IconUserCog className="mr-2 size-4" />
									Change Role
								</DropdownMenuItem>
							)}
							<DropdownMenuItem onClick={onToggleActive} disabled={isPending}>
								{user.isActive ? (
									<>
										<IconUserX className="mr-2 size-4" />
										Deactivate
									</>
								) : (
									<>
										<IconUserCheck className="mr-2 size-4" />
										Activate
									</>
								)}
							</DropdownMenuItem>
							<DropdownMenuItem
								onClick={onToggleLateSubmission}
								disabled={isPending}
								data-testid="toggle-late-submission"
							>
								{user.allowLateSubmission ? (
									<>
										<IconClockX className="mr-2 size-4" />
										Disallow late submission
									</>
								) : (
									<>
										<IconClockPlus className="mr-2 size-4" />
										Allow late submission
									</>
								)}
							</DropdownMenuItem>
							{canDeleteUsers && (
								<>
									<DropdownMenuSeparator />
									<DropdownMenuItem variant="destructive" onClick={onDelete}>
										<IconTrash className="mr-2 size-4" />
										Delete User
									</DropdownMenuItem>
								</>
							)}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</CardHeader>
		</Card>
	);
}
