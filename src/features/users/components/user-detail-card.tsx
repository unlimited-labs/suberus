import { IconTrash } from "@tabler/icons-react";
import { assignableRoleOptions } from "@/features/users/labels";
import type { AdminUserDetail } from "@/features/users/server/users";
import { useAdminAuth } from "@/shared/hooks/use-admin-auth";
import { useDateFormat } from "@/shared/hooks/use-date-format";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Separator } from "@/shared/ui/separator";
import { useUserDetailMutations } from "./use-user-detail-mutations";
import { UserAccountSection } from "./user-account-section";
import { UserContactSection } from "./user-contact-section";
import { UserDeleteDialog } from "./user-delete-dialog";
import { UserDetailHeader } from "./user-detail-header";
import { UserEditDialog } from "./user-edit-dialog";
import { UserFeeDialog } from "./user-fee-dialog";
import { UserFeeStatusSection } from "./user-fee-status-section";
import { UserRoleDialog } from "./user-role-dialog";
import { UserSubmissionsSection } from "./user-submissions-section";
import { UserSurveySection } from "./user-survey-section";

interface UserDetailCardProps {
	user: AdminUserDetail;
}

export function UserDetailCard({ user }: UserDetailCardProps) {
	const {
		canChangeRoles,
		canAssignAdminRole,
		canEditProfiles,
		canDeleteUsers,
	} = useAdminAuth();
	// Editors cannot modify a user who is already an admin.
	// Exhibitor role is managed by the exhibitor lifecycle, not manual change.
	const canChangeThisRole =
		canChangeRoles &&
		(canAssignAdminRole || user.role !== "ADMIN") &&
		user.role !== "EXHIBITOR";
	const { formatDateTime } = useDateFormat();
	const fmtDate = (date: Date | null) => (date ? formatDateTime(date) : "—");

	const {
		feeTypes,
		currency,
		selectedFeeTypeId,
		setSelectedFeeTypeId,
		selectedFeeType,
		selectedRole,
		setSelectedRole,
		feeDialogOpen,
		setFeeDialogOpen,
		roleDialogOpen,
		setRoleDialogOpen,
		editDialogOpen,
		setEditDialogOpen,
		deleteDialogOpen,
		setDeleteDialogOpen,
		isPending,
		handleMarkFeePaid,
		handleUnmarkFeePaid,
		handleChangeRole,
		handleToggleActive,
		handleToggleLateSubmission,
		handleVerifyEmail,
	} = useUserDetailMutations(user);

	const userName = `${user.firstName} ${user.lastName}`;

	return (
		<>
			<Card>
				<UserDetailHeader
					user={user}
					canEditProfiles={canEditProfiles}
					canChangeThisRole={canChangeThisRole}
					isPending={isPending}
					onEdit={() => setEditDialogOpen(true)}
					onChangeRole={() => setRoleDialogOpen(true)}
					onToggleActive={handleToggleActive}
					onToggleLateSubmission={handleToggleLateSubmission}
				/>
				<CardContent className="space-y-6">
					<UserContactSection user={user} />

					<Separator />

					<UserAccountSection
						user={user}
						fmtDate={fmtDate}
						isPending={isPending}
						onVerifyEmail={handleVerifyEmail}
					/>

					<Separator />

					<UserSubmissionsSection submissions={user.submissions} />

					<Separator />

					<UserSurveySection surveyAnswers={user.surveyAnswers} />

					<UserFeeStatusSection
						fee={user.fee}
						fmtDate={fmtDate}
						isPending={isPending}
						onMark={() => setFeeDialogOpen(true)}
						onUnmark={handleUnmarkFeePaid}
					/>

					{canDeleteUsers && (
						<>
							<Separator />
							<div className="flex justify-end">
								<Button
									variant="destructive"
									size="sm"
									onClick={() => setDeleteDialogOpen(true)}
								>
									<IconTrash className="mr-2 size-4" />
									Delete User
								</Button>
							</div>
						</>
					)}
				</CardContent>
			</Card>

			{canEditProfiles && (
				<UserEditDialog
					user={user}
					open={editDialogOpen}
					onOpenChange={setEditDialogOpen}
				/>
			)}

			{canDeleteUsers && (
				<UserDeleteDialog
					user={user}
					open={deleteDialogOpen}
					onOpenChange={setDeleteDialogOpen}
				/>
			)}

			<UserFeeDialog
				open={feeDialogOpen}
				onOpenChange={setFeeDialogOpen}
				userName={userName}
				feeTypes={feeTypes}
				currency={currency}
				selectedFeeTypeId={selectedFeeTypeId}
				selectedFeeType={selectedFeeType}
				onFeeTypeChange={setSelectedFeeTypeId}
				onConfirm={handleMarkFeePaid}
				isPending={isPending}
			/>
			<UserRoleDialog
				open={roleDialogOpen}
				onOpenChange={setRoleDialogOpen}
				userName={userName}
				selectedRole={selectedRole}
				onRoleChange={setSelectedRole}
				onConfirm={handleChangeRole}
				isPending={isPending}
				roleOptions={assignableRoleOptions(canAssignAdminRole)}
			/>
		</>
	);
}
