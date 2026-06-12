import {
	IconBuilding,
	IconCalendar,
	IconCash,
	IconClock,
	IconClockPlus,
	IconClockX,
	IconEdit,
	IconId,
	IconMail,
	IconMailCheck,
	IconMailX,
	IconMapPin,
	IconTrash,
	IconUserCheck,
	IconUserCog,
	IconUserX,
	IconWorld,
	IconX,
} from "@tabler/icons-react";
import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { useDateFormat } from "@/hooks/use-date-format";
import {
	type AssignableUserRole,
	assignableRoleOptions,
	roleLabels,
	titleLabels,
} from "@/lib/labels";
import type { AdminUserDetail } from "@/lib/server/admin/users";
import {
	adminUserDetailQueryOptions,
	adminUsersQueryOptions,
	patchAdminUser,
} from "@/server-fns/admin/users";
import {
	feeCurrencyQueryOptions,
	feeTypesQueryOptions,
} from "@/server-fns/settings";
import { UserDeleteDialog } from "./user-delete-dialog";
import { UserEditDialog } from "./user-edit-dialog";
import { UserSubmissionsSection } from "./user-submissions-section";
import { UserSurveySection } from "./user-survey-section";

interface FeeType {
	id: string;
	name: string;
	amount: number;
}

interface UserFeeDialogProps {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	userName: string;
	feeTypes: FeeType[];
	currency: string;
	selectedFeeTypeId: string;
	selectedFeeType: FeeType | undefined;
	onFeeTypeChange: (id: string) => void;
	onConfirm: () => void;
	isPending: boolean;
}

function UserFeeDialog({
	open,
	onOpenChange,
	userName,
	feeTypes,
	currency,
	selectedFeeTypeId,
	selectedFeeType,
	onFeeTypeChange,
	onConfirm,
	isPending,
}: UserFeeDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Mark Fee as Paid</DialogTitle>
					<DialogDescription>
						Select fee type for user {userName}.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-3 py-4">
					<Select value={selectedFeeTypeId} onValueChange={onFeeTypeChange}>
						<SelectTrigger>
							<SelectValue placeholder="Select fee type" />
						</SelectTrigger>
						<SelectContent>
							{feeTypes.map((type) => (
								<SelectItem key={type.id} value={type.id}>
									{type.name} — {type.amount.toFixed(2)} {currency}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					{selectedFeeType && (
						<p className="text-sm text-muted-foreground">
							Amount: {selectedFeeType.amount.toFixed(2)} {currency}
						</p>
					)}
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button onClick={onConfirm} disabled={isPending}>
						{isPending ? "Saving..." : "Save"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

interface UserRoleDialogProps {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	userName: string;
	selectedRole: AssignableUserRole;
	onRoleChange: (role: AssignableUserRole) => void;
	onConfirm: () => void;
	isPending: boolean;
	roleOptions: { value: AssignableUserRole; label: string }[];
}

function UserRoleDialog({
	open,
	onOpenChange,
	userName,
	selectedRole,
	onRoleChange,
	onConfirm,
	isPending,
	roleOptions,
}: UserRoleDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Change User Role</DialogTitle>
					<DialogDescription>
						Select a new role for user {userName}.
					</DialogDescription>
				</DialogHeader>
				<div className="py-4">
					<Select
						value={selectedRole}
						onValueChange={(v) => {
							const found = roleOptions.find((opt) => opt.value === v);
							if (found) onRoleChange(found.value);
						}}
					>
						<SelectTrigger>
							<SelectValue placeholder="Select role" />
						</SelectTrigger>
						<SelectContent>
							{roleOptions.map((role) => (
								<SelectItem key={role.value} value={role.value}>
									{role.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button onClick={onConfirm} disabled={isPending}>
						{isPending ? "Saving..." : "Save"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

interface UserDetailCardProps {
	user: AdminUserDetail;
}

interface PatchPayload {
	role?: AssignableUserRole;
	isActive?: boolean;
	allowLateSubmission?: boolean;
	markFeePaid?: boolean;
	feeType?: string;
	feeAmount?: number;
	feeCurrency?: string;
	unmarkFeePaid?: boolean;
	verifyEmail?: boolean;
}

export function UserDetailCard({ user }: UserDetailCardProps) {
	const queryClient = useQueryClient();
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
	const [feeDialogOpen, setFeeDialogOpen] = useState(false);
	const [roleDialogOpen, setRoleDialogOpen] = useState(false);
	const [editDialogOpen, setEditDialogOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

	const { data: feeTypes } = useSuspenseQuery(feeTypesQueryOptions());
	const { data: currency } = useSuspenseQuery(feeCurrencyQueryOptions());

	const [selectedFeeTypeId, setSelectedFeeTypeId] = useState<string>(
		feeTypes[0]?.id ?? "",
	);
	// EXHIBITOR cannot be granted here (exhibitor signup only), so default to AUTHOR
	const [selectedRole, setSelectedRole] = useState<AssignableUserRole>(
		user.role === "EXHIBITOR" ? "AUTHOR" : user.role,
	);

	const selectedFeeType = feeTypes.find((ft) => ft.id === selectedFeeTypeId);

	const mutation = useMutation({
		mutationFn: (payload: PatchPayload) =>
			patchAdminUser({ data: { id: user.id, ...payload } }),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: adminUsersQueryOptions().queryKey,
			});
			queryClient.invalidateQueries({
				queryKey: adminUserDetailQueryOptions(user.id).queryKey,
			});
			setFeeDialogOpen(false);
			setRoleDialogOpen(false);
		},
	});

	const handleMarkFeePaid = () => {
		if (!selectedFeeType) return;
		mutation.mutate({
			markFeePaid: true,
			feeType: selectedFeeType.name,
			feeAmount: selectedFeeType.amount,
			feeCurrency: currency,
		});
	};

	const handleUnmarkFeePaid = () => {
		mutation.mutate({ unmarkFeePaid: true });
	};

	const handleChangeRole = () => {
		mutation.mutate({ role: selectedRole });
	};

	const handleToggleActive = () => {
		mutation.mutate({ isActive: !user.isActive });
	};

	const handleToggleLateSubmission = () => {
		mutation.mutate({ allowLateSubmission: !user.allowLateSubmission });
	};

	const handleVerifyEmail = () => {
		mutation.mutate({ verifyEmail: true });
	};

	return (
		<>
			<Card>
				<CardHeader>
					<div className="flex items-start justify-between">
						<div>
							<CardTitle className="text-xl">
								{user.title && `${titleLabels[user.title] ?? user.title} `}
								{user.firstName} {user.lastName}
							</CardTitle>
							<div className="mt-1 flex items-center gap-2">
								<Badge
									variant={user.role === "ADMIN" ? "default" : "secondary"}
								>
									{roleLabels[user.role]}
								</Badge>
								{!user.isActive && (
									<Badge variant="destructive">Inactive</Badge>
								)}
							</div>
						</div>
						<div className="flex flex-wrap gap-2">
							{canEditProfiles && (
								<Button
									variant="outline"
									size="sm"
									onClick={() => setEditDialogOpen(true)}
								>
									<IconEdit className="mr-2 size-4" />
									Edit Profile
								</Button>
							)}
							{canChangeThisRole && (
								<Button
									variant="outline"
									size="sm"
									onClick={() => setRoleDialogOpen(true)}
								>
									<IconUserCog className="mr-2 size-4" />
									Change Role
								</Button>
							)}
							<Button
								variant="outline"
								size="sm"
								onClick={handleToggleActive}
								disabled={mutation.isPending}
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
								onClick={handleToggleLateSubmission}
								disabled={mutation.isPending}
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
				<CardContent className="space-y-6">
					{/* Contact Info */}
					<div className="space-y-3">
						<h3 className="text-sm font-medium text-muted-foreground">
							Contact Information
						</h3>
						<div className="grid gap-3 sm:grid-cols-2">
							<div className="flex items-center gap-2">
								<IconMail className="size-4 text-muted-foreground" />
								<a
									href={`mailto:${user.email}`}
									className="text-primary hover:underline"
								>
									{user.email}
								</a>
							</div>
							{user.affiliation && (
								<div className="flex items-center gap-2">
									<IconBuilding className="size-4 text-muted-foreground" />
									<span>{user.affiliation}</span>
								</div>
							)}
							{user.orcid && (
								<div className="flex items-center gap-2">
									<IconId className="size-4 text-muted-foreground" />
									<span>ORCID: {user.orcid}</span>
								</div>
							)}
							{user.country && (
								<div className="flex items-center gap-2">
									<IconWorld className="size-4 text-muted-foreground" />
									<span>{user.country}</span>
								</div>
							)}
							{user.address && (
								<div className="flex items-start gap-2 sm:col-span-2">
									<IconMapPin className="mt-0.5 size-4 text-muted-foreground" />
									<span className="whitespace-pre-line">{user.address}</span>
								</div>
							)}
						</div>
					</div>

					<Separator />

					{/* Account Info */}
					<div className="space-y-3">
						<h3 className="text-sm font-medium text-muted-foreground">
							Account Information
						</h3>
						<div className="grid gap-3 sm:grid-cols-2">
							<div className="flex items-center gap-2">
								<IconCalendar className="size-4 text-muted-foreground" />
								<span>Created: {fmtDate(user.createdAt)}</span>
							</div>
							<div className="flex items-center gap-2">
								<IconClock className="size-4 text-muted-foreground" />
								<span>Last login: {fmtDate(user.lastLoginAt)}</span>
							</div>
							<div className="flex items-center gap-2">
								{user.emailVerified ? (
									<>
										<IconMailCheck className="size-4 text-green-600" />
										<span className="text-green-600">Email verified</span>
									</>
								) : (
									<>
										<IconMailX className="size-4 text-yellow-600" />
										<span className="text-yellow-600">Email not verified</span>
										<Button
											variant="outline"
											size="sm"
											className="ml-2 h-7"
											onClick={handleVerifyEmail}
											disabled={mutation.isPending}
										>
											Verify
										</Button>
									</>
								)}
							</div>
						</div>
					</div>

					<Separator />

					{/* Submissions */}
					<UserSubmissionsSection submissions={user.submissions} />

					<Separator />

					{/* Survey Responses */}
					<UserSurveySection surveyAnswers={user.surveyAnswers} />

					{/* Fee Status */}
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<h3 className="text-sm font-medium text-muted-foreground">
								Fee Status
							</h3>
							{!user.fee?.paid && (
								<Button
									variant="outline"
									size="sm"
									onClick={() => setFeeDialogOpen(true)}
								>
									<IconCash className="mr-2 size-4" />
									Mark as Paid
								</Button>
							)}
						</div>
						{user.fee?.paid ? (
							<div className="rounded-lg border bg-green-50 p-4 dark:bg-green-950/20">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<IconCash className="size-5 text-green-600" />
										<span className="font-medium text-green-700 dark:text-green-400">
											Fee Paid
										</span>
									</div>
									<Button
										variant="ghost"
										size="sm"
										className="h-7 text-muted-foreground hover:text-destructive"
										onClick={handleUnmarkFeePaid}
										disabled={mutation.isPending}
									>
										<IconX className="mr-1 size-3.5" />
										Unmark
									</Button>
								</div>
								<p className="mt-1 text-sm text-green-600 dark:text-green-500">
									Type: {user.fee.type}
									{user.fee.amount !== null && user.fee.currency && (
										<>
											{" • "}
											Amount: {user.fee.amount.toFixed(2)} {user.fee.currency}
										</>
									)}
									{" • "}
									Paid on: {fmtDate(user.fee.paidAt)}
								</p>
							</div>
						) : (
							<div className="rounded-lg border bg-red-50 p-4 dark:bg-red-950/20">
								<div className="flex items-center gap-2">
									<IconCash className="size-5 text-red-600" />
									<span className="font-medium text-red-700 dark:text-red-400">
										Fee Unpaid
									</span>
								</div>
							</div>
						)}
					</div>

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
				userName={`${user.firstName} ${user.lastName}`}
				feeTypes={feeTypes}
				currency={currency}
				selectedFeeTypeId={selectedFeeTypeId}
				selectedFeeType={selectedFeeType}
				onFeeTypeChange={setSelectedFeeTypeId}
				onConfirm={handleMarkFeePaid}
				isPending={mutation.isPending}
			/>
			<UserRoleDialog
				open={roleDialogOpen}
				onOpenChange={setRoleDialogOpen}
				userName={`${user.firstName} ${user.lastName}`}
				selectedRole={selectedRole}
				onRoleChange={setSelectedRole}
				onConfirm={handleChangeRole}
				isPending={mutation.isPending}
				roleOptions={assignableRoleOptions(canAssignAdminRole)}
			/>
		</>
	);
}
