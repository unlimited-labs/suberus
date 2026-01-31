import {
	IconBuilding,
	IconCalendar,
	IconCash,
	IconClock,
	IconId,
	IconMail,
	IconUserCheck,
	IconUserCog,
	IconUserX,
} from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import type { FeeType, UserRole } from "@/generated/prisma/enums";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import type { AdminUser } from "@/lib/server/admin/users";
import { patchAdminUser } from "@/utils/admin-users.functions";

interface UserDetailCardProps {
	user: AdminUser;
}

const roleLabels: Record<string, string> = {
	ADMIN: "Administrator",
	EDITOR: "Editor",
	REVIEWER: "Reviewer",
	AUTHOR: "Author",
};

const feeTypes: { value: FeeType; label: string }[] = [
	{ value: "FULL", label: "Full" },
	{ value: "STUDENT", label: "Student" },
	{ value: "INVITED", label: "Invited" },
	{ value: "STAFF", label: "Staff" },
	{ value: "CASH", label: "Cash" },
];

const userRoles: { value: UserRole; label: string }[] = [
	{ value: "AUTHOR", label: "Author" },
	{ value: "REVIEWER", label: "Reviewer" },
	{ value: "EDITOR", label: "Editor" },
	{ value: "ADMIN", label: "Administrator" },
];

function formatDate(date: Date | null): string {
	if (!date) return "—";
	return new Intl.DateTimeFormat("en-US", {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(date));
}

interface PatchPayload {
	role?: UserRole;
	isActive?: boolean;
	markFeePaid?: boolean;
	feeType?: FeeType;
}

export function UserDetailCard({ user }: UserDetailCardProps) {
	const queryClient = useQueryClient();
	const { canChangeRoles } = useAdminAuth();
	const [feeDialogOpen, setFeeDialogOpen] = useState(false);
	const [roleDialogOpen, setRoleDialogOpen] = useState(false);
	const [selectedFeeType, setSelectedFeeType] = useState<FeeType>(
		user.fee?.type ?? "FULL",
	);
	const [selectedRole, setSelectedRole] = useState<UserRole>(user.role);

	const mutation = useMutation({
		mutationFn: (payload: PatchPayload) =>
			patchAdminUser({ data: { id: user.id, ...payload } }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admin-users"] });
			queryClient.invalidateQueries({ queryKey: ["admin-user", user.id] });
			setFeeDialogOpen(false);
			setRoleDialogOpen(false);
		},
	});

	const handleMarkFeePaid = () => {
		mutation.mutate({ markFeePaid: true, feeType: selectedFeeType });
	};

	const handleChangeRole = () => {
		mutation.mutate({ role: selectedRole });
	};

	const handleToggleActive = () => {
		mutation.mutate({ isActive: !user.isActive });
	};

	return (
		<>
			<Card>
				<CardHeader>
					<div className="flex items-start justify-between">
						<div>
							<CardTitle className="text-xl">
								{user.title && `${user.title} `}
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
						<div className="flex gap-2">
							{canChangeRoles && (
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
								<span>{user.email}</span>
							</div>
							{user.affiliation && (
								<div className="flex items-center gap-2">
									<IconBuilding className="size-4 text-muted-foreground" />
									<span>{user.affiliation}</span>
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
								<IconId className="size-4 text-muted-foreground" />
								<span className="text-xs font-mono">{user.id}</span>
							</div>
							<div className="flex items-center gap-2">
								<IconCalendar className="size-4 text-muted-foreground" />
								<span>Created: {formatDate(user.createdAt)}</span>
							</div>
							<div className="flex items-center gap-2">
								<IconClock className="size-4 text-muted-foreground" />
								<span>Last login: {formatDate(user.lastLoginAt)}</span>
							</div>
						</div>
					</div>

					<Separator />

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
								<div className="flex items-center gap-2">
									<IconCash className="size-5 text-green-600" />
									<span className="font-medium text-green-700 dark:text-green-400">
										Fee Paid
									</span>
								</div>
								<p className="mt-1 text-sm text-green-600 dark:text-green-500">
									Type:{" "}
									{feeTypes.find((f) => f.value === user.fee?.type)?.label ??
										user.fee.type}
									{" • "}
									Paid on: {formatDate(user.fee.paidAt)}
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
				</CardContent>
			</Card>

			{/* Fee Dialog */}
			<Dialog open={feeDialogOpen} onOpenChange={setFeeDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Mark Fee as Paid</DialogTitle>
						<DialogDescription>
							Select fee type for user {user.firstName} {user.lastName}.
						</DialogDescription>
					</DialogHeader>
					<div className="py-4">
						<Select
							value={selectedFeeType}
							onValueChange={(v) => setSelectedFeeType(v as FeeType)}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select fee type" />
							</SelectTrigger>
							<SelectContent>
								{feeTypes.map((type) => (
									<SelectItem key={type.value} value={type.value}>
										{type.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setFeeDialogOpen(false)}>
							Cancel
						</Button>
						<Button onClick={handleMarkFeePaid} disabled={mutation.isPending}>
							{mutation.isPending ? "Saving..." : "Save"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Role Dialog */}
			<Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Change User Role</DialogTitle>
						<DialogDescription>
							Select a new role for user {user.firstName} {user.lastName}.
						</DialogDescription>
					</DialogHeader>
					<div className="py-4">
						<Select
							value={selectedRole}
							onValueChange={(v) => setSelectedRole(v as UserRole)}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select role" />
							</SelectTrigger>
							<SelectContent>
								{userRoles.map((role) => (
									<SelectItem key={role.value} value={role.value}>
										{role.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
							Cancel
						</Button>
						<Button onClick={handleChangeRole} disabled={mutation.isPending}>
							{mutation.isPending ? "Saving..." : "Save"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
