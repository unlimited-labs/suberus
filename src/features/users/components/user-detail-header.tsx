import {
	IconClockPlus,
	IconClockX,
	IconEdit,
	IconUserCheck,
	IconUserCog,
	IconUserX,
} from "@tabler/icons-react";
import { roleLabels } from "@/features/users/labels";
import type { AdminUserDetail } from "@/features/users/server/users";
import { titleLabels } from "@/shared/lib/labels/title";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { CardHeader, CardTitle } from "@/shared/ui/card";

interface UserDetailHeaderProps {
	user: AdminUserDetail;
	canEditProfiles: boolean;
	canChangeThisRole: boolean;
	isPending: boolean;
	onEdit: () => void;
	onChangeRole: () => void;
	onToggleActive: () => void;
	onToggleLateSubmission: () => void;
}

export function UserDetailHeader({
	user,
	canEditProfiles,
	canChangeThisRole,
	isPending,
	onEdit,
	onChangeRole,
	onToggleActive,
	onToggleLateSubmission,
}: UserDetailHeaderProps) {
	return (
		<CardHeader>
			<div className="flex items-start justify-between">
				<div>
					<CardTitle className="text-xl">
						{user.title && `${titleLabels[user.title] ?? user.title} `}
						{user.firstName} {user.lastName}
					</CardTitle>
					<div className="mt-1 flex items-center gap-2">
						<Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>
							{roleLabels[user.role]}
						</Badge>
						{!user.isActive && <Badge variant="destructive">Inactive</Badge>}
					</div>
				</div>
				<div className="flex flex-wrap gap-2">
					{canEditProfiles && (
						<Button variant="outline" size="sm" onClick={onEdit}>
							<IconEdit className="mr-2 size-4" />
							Edit Profile
						</Button>
					)}
					{canChangeThisRole && (
						<Button variant="outline" size="sm" onClick={onChangeRole}>
							<IconUserCog className="mr-2 size-4" />
							Change Role
						</Button>
					)}
					<Button
						variant="outline"
						size="sm"
						onClick={onToggleActive}
						disabled={isPending}
					>
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
					</Button>
					<Button
						variant="outline"
						size="sm"
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
					</Button>
				</div>
			</div>
		</CardHeader>
	);
}
