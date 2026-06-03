import { IconBuilding, IconMail } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { BillingFieldsGroup } from "@/components/forms/composable/billing-fields-group";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useAppForm } from "@/hooks/use-app-form";
import { titleOptions } from "@/lib/labels";
import type { AdminUser } from "@/lib/server/admin/users";
import type { AdminUserEditFormData } from "@/lib/validations/profile";
import { adminUserEditSchema } from "@/lib/validations/profile";
import {
	adminUserDetailQueryOptions,
	adminUsersQueryOptions,
	updateAdminUserProfile,
} from "@/server-fns/admin/users";

interface UserEditDialogProps {
	user: AdminUser;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function UserEditDialog({
	user,
	open,
	onOpenChange,
}: UserEditDialogProps) {
	const queryClient = useQueryClient();

	const mutation = useMutation({
		mutationFn: (data: {
			firstName: string;
			lastName: string;
			title?: string;
			affiliation?: string;
			orcid?: string;
			email: string;
			needInvoice?: boolean;
			address?: string;
			country?: string;
		}) => updateAdminUserProfile({ data: { id: user.id, ...data } }),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: adminUsersQueryOptions().queryKey,
			});
			queryClient.invalidateQueries({
				queryKey: adminUserDetailQueryOptions(user.id).queryKey,
			});
			onOpenChange(false);
			toast.success("Profile updated");
		},
		onError: (error) => {
			if (error instanceof Response && error.status === 409) {
				toast.error("Email already in use");
			} else {
				toast.error("Failed to update profile");
			}
		},
	});

	const defaultValues: AdminUserEditFormData = {
		firstName: user.firstName ?? "",
		lastName: user.lastName ?? "",
		title: user.title ?? "",
		affiliation: user.affiliation ?? "",
		orcid: user.orcid ?? "",
		email: user.email,
		needInvoice: user.needInvoice,
		address: user.address ?? "",
		country: user.country ?? "",
	};

	const form = useAppForm({
		defaultValues,
		validators: {
			onChange: adminUserEditSchema,
			onSubmit: adminUserEditSchema,
		},
		onSubmit: async ({ value }) => {
			await mutation.mutateAsync({
				firstName: value.firstName,
				lastName: value.lastName,
				title: value.title || undefined,
				affiliation: value.affiliation || undefined,
				orcid: value.orcid || undefined,
				email: value.email,
				needInvoice: value.needInvoice,
				address: value.address || undefined,
				country: value.country || undefined,
			});
		},
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Edit User Profile</DialogTitle>
				</DialogHeader>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						void form.handleSubmit();
					}}
					className="space-y-4"
				>
					<div className="grid gap-4 sm:grid-cols-2">
						<form.AppField name="firstName">
							{(field) => <field.InputField label="First name *" />}
						</form.AppField>
						<form.AppField name="lastName">
							{(field) => <field.InputField label="Last name *" />}
						</form.AppField>
					</div>

					<div className="grid gap-4 sm:grid-cols-2">
						<form.AppField name="title">
							{(field) => (
								<field.SelectField
									label="Title"
									options={titleOptions}
									placeholder="—"
								/>
							)}
						</form.AppField>
						<form.AppField name="affiliation">
							{(field) => (
								<field.IconInputField
									label="Affiliation"
									icon={<IconBuilding className="size-4" />}
								/>
							)}
						</form.AppField>
					</div>

					<form.AppField name="orcid">
						{(field) => (
							<field.InputField
								label="ORCID"
								placeholder="0000-0002-1825-0097"
							/>
						)}
					</form.AppField>

					<form.AppField name="email">
						{(field) => (
							<field.IconInputField
								label="Email *"
								type="email"
								icon={<IconMail className="size-4" />}
							/>
						)}
					</form.AppField>

					<BillingFieldsGroup
						form={form}
						fields={{
							needInvoice: "needInvoice",
							address: "address",
							country: "country",
						}}
						needInvoiceLabel="Needs invoice for organization"
					/>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<form.AppForm>
							<form.SubmitButton
								label="Save"
								submittingLabel="Saving..."
								disabled={mutation.isPending}
							/>
						</form.AppForm>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
