import {
	IconCash,
	IconFileText,
	IconMail,
	IconPlus,
	IconUserCircle,
} from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { UserDocumentsSection } from "@/features/documents/components/user-documents-section";
import { adminSurveyQuestionsQueryOptions } from "@/features/survey/api/survey";
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
import { UserSurveyDialog } from "./user-survey-dialog";
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
		surveyDialogOpen,
		setSurveyDialogOpen,
		isPending,
		isResendPending,
		handleResendSetPassword,
		handleMarkFeePaid,
		handleUnmarkFeePaid,
		handleChangeRole,
		handleToggleActive,
		handleToggleLateSubmission,
		handleVerifyEmail,
	} = useUserDetailMutations(user);

	const [documentDialogOpen, setDocumentDialogOpen] = useState(false);

	const { data: surveyQuestions } = useSuspenseQuery(
		adminSurveyQuestionsQueryOptions(),
	);
	const activeSurveyQuestions = surveyQuestions.filter((q) => q.isActive);

	const userName = `${user.firstName} ${user.lastName}`;

	return (
		<>
			<div className="space-y-6">
				<UserDetailHeader
					canChangeThisRole={canChangeThisRole}
					canDeleteUsers={canDeleteUsers}
					canEditProfiles={canEditProfiles}
					isPending={isPending}
					isResendPending={isResendPending}
					onChangeRole={() => setRoleDialogOpen(true)}
					onDelete={() => setDeleteDialogOpen(true)}
					onEdit={() => setEditDialogOpen(true)}
					onGenerateDocument={() => setDocumentDialogOpen(true)}
					onResendSetPassword={handleResendSetPassword}
					onToggleActive={handleToggleActive}
					onToggleLateSubmission={handleToggleLateSubmission}
					user={user}
				/>

				<SectionCard icon={IconMail} title="Contact Information">
					<UserContactSection user={user} />
				</SectionCard>

				<SectionCard icon={IconUserCircle} title="Account Information">
					<UserAccountSection
						fmtDate={fmtDate}
						isPending={isPending}
						onVerifyEmail={handleVerifyEmail}
						user={user}
					/>
				</SectionCard>

				<SectionCard
					action={
						<Button asChild size="sm" variant="outline">
							<Link
								data-testid="add-submission-on-behalf"
								params={{ id: user.id }}
								to="/admin/users/$id/submissions/new"
							>
								<IconPlus className="mr-2 size-4" />
								Add submission
							</Link>
						</Button>
					}
					icon={IconFileText}
					title="Submissions"
				>
					<UserSubmissionsSection submissions={user.submissions} />
				</SectionCard>

				<UserSurveySection
					onEdit={() => setSurveyDialogOpen(true)}
					surveyAnswers={user.surveyAnswers}
				/>

				<UserDocumentsSection
					addOpen={documentDialogOpen}
					onAddOpenChange={setDocumentDialogOpen}
					userId={user.id}
					userName={userName}
				/>

				<SectionCard
					action={
						!user.fee?.paid && (
							<Button
								onClick={() => setFeeDialogOpen(true)}
								size="sm"
								variant="outline"
							>
								<IconCash className="mr-2 size-4" />
								Mark as Paid
							</Button>
						)
					}
					icon={IconCash}
					title="Fee Status"
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
					onOpenChange={setEditDialogOpen}
					open={editDialogOpen}
					user={user}
				/>
			)}

			{canDeleteUsers && (
				<UserDeleteDialog
					onOpenChange={setDeleteDialogOpen}
					open={deleteDialogOpen}
					user={user}
				/>
			)}

			<UserFeeDialog
				currency={currency}
				feeTypes={feeTypes}
				isPending={isPending}
				onConfirm={handleMarkFeePaid}
				onFeeTypeChange={setSelectedFeeTypeId}
				onOpenChange={setFeeDialogOpen}
				open={feeDialogOpen}
				selectedFeeType={selectedFeeType}
				selectedFeeTypeId={selectedFeeTypeId}
				userName={userName}
			/>
			<UserRoleDialog
				isPending={isPending}
				onConfirm={handleChangeRole}
				onOpenChange={setRoleDialogOpen}
				onRoleChange={setSelectedRole}
				open={roleDialogOpen}
				roleOptions={assignableRoleOptions(canAssignAdminRole)}
				selectedRole={selectedRole}
				userName={userName}
			/>
			<UserSurveyDialog
				initialAnswers={user.surveyAnswers}
				onOpenChange={setSurveyDialogOpen}
				open={surveyDialogOpen}
				questions={activeSurveyQuestions}
				userId={user.id}
				userName={userName}
			/>
		</>
	);
}
