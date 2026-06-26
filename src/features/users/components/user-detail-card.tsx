import {
	IconCash,
	IconFileText,
	IconMail,
	IconUserCircle,
} from "@tabler/icons-react";
import { UserDocumentsSection } from "@/features/documents/components/user-documents-section";
import { assignableRoleOptions } from "@/features/users/labels";
import type { AdminUserDetail } from "@/features/users/server/users";
import { useAdminAuth } from "@/shared/hooks/use-admin-auth";
import { useDateFormat } from "@/shared/hooks/use-date-format";
import { Button } from "@/shared/ui/button";
import { SectionCard } from "@/shared/ui/section-card";
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
			<div className="space-y-6">
				<UserDetailHeader
					user={user}
					canEditProfiles={canEditProfiles}
					canChangeThisRole={canChangeThisRole}
					canDeleteUsers={canDeleteUsers}
					isPending={isPending}
					onEdit={() => setEditDialogOpen(true)}
					onChangeRole={() => setRoleDialogOpen(true)}
					onToggleActive={handleToggleActive}
					onToggleLateSubmission={handleToggleLateSubmission}
					onDelete={() => setDeleteDialogOpen(true)}
				/>

				<SectionCard icon={IconMail} title="Contact Information">
					<UserContactSection user={user} />
				</SectionCard>

				<SectionCard icon={IconUserCircle} title="Account Information">
					<UserAccountSection
						user={user}
						fmtDate={fmtDate}
						isPending={isPending}
						onVerifyEmail={handleVerifyEmail}
					/>
				</SectionCard>

				<SectionCard icon={IconFileText} title="Submissions">
					<UserSubmissionsSection submissions={user.submissions} />
				</SectionCard>

				<UserSurveySection surveyAnswers={user.surveyAnswers} />

				<UserDocumentsSection userId={user.id} userName={userName} />

				<SectionCard
					icon={IconCash}
					title="Fee Status"
					action={
						!user.fee?.paid && (
							<Button
								variant="outline"
								size="sm"
								onClick={() => setFeeDialogOpen(true)}
							>
								<IconCash className="mr-2 size-4" />
								Mark as Paid
							</Button>
						)
					}
				>
					<UserFeeStatusSection
						fee={user.fee}
						fmtDate={fmtDate}
						isPending={isPending}
						onUnmark={handleUnmarkFeePaid}
					/>
				</SectionCard>
			</div>

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
