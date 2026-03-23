import { IconBuilding, IconMail } from "@tabler/icons-react";
import { useStore } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { CountryCombobox } from "@/components/ui/country-combobox";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { useAppForm } from "@/hooks/use-app-form";
import { submitForm } from "@/lib/form-utils";
import { titleOptions } from "@/lib/labels";
import type { AdminUser } from "@/lib/server/admin/users";
import { cn } from "@/lib/utils";
import {
	adminUserDetailQueryOptions,
	adminUsersQueryOptions,
	updateAdminUserProfile,
} from "@/utils/admin-users.functions";

const orcidRegex = /^\d{4}-\d{4}-\d{4}-\d{3}[0-9X]$/;

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

	const form = useAppForm({
		defaultValues: {
			firstName: user.firstName ?? "",
			lastName: user.lastName ?? "",
			title: user.title ?? "",
			affiliation: user.affiliation ?? "",
			orcid: user.orcid ?? "",
			email: user.email,
			needInvoice: user.needInvoice,
			address: user.address ?? "",
			country: user.country ?? "",
		},
		validators: {
			onSubmit: ({ value }) => {
				const errors: Record<string, string> = {};
				if (value.firstName.length < 2) errors.firstName = "Min 2 characters";
				if (value.lastName.length < 2) errors.lastName = "Min 2 characters";
				if (!value.email) errors.email = "Email is required";
				if (value.orcid && !orcidRegex.test(value.orcid))
					errors.orcid = "Invalid ORCID format";
				return Object.keys(errors).length > 0 ? errors : undefined;
			},
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

	const needInvoice = useStore(form.store, (s) => s.values.needInvoice);

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
						void submitForm(form);
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

					<form.AppField name="needInvoice">
						{(field) => (
							<field.CheckboxField label="Needs invoice for organization" />
						)}
					</form.AppField>

					{needInvoice && (
						<form.Field name="address">
							{(field) => {
								const hasError =
									field.state.meta.isBlurred &&
									field.state.meta.errors.length > 0;
								return (
									<Field data-invalid={hasError}>
										<FieldLabel htmlFor={field.name}>
											Billing details (organization)
										</FieldLabel>
										<textarea
											id={field.name}
											rows={3}
											placeholder="Company/organization name, billing address, VAT/Tax ID (if applicable)"
											aria-invalid={hasError}
											className={cn(
												"flex w-full resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm text-foreground transition-colors",
												"placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
												"disabled:cursor-not-allowed disabled:opacity-50",
												"aria-invalid:border-destructive aria-invalid:ring-destructive/20 aria-invalid:ring-[3px]",
											)}
											value={field.state.value || ""}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
										/>
									</Field>
								);
							}}
						</form.Field>
					)}

					<form.Field name="country">
						{(field) => (
							<Field>
								<FieldLabel>Country</FieldLabel>
								<CountryCombobox
									value={field.state.value || ""}
									onChange={field.handleChange}
								/>
							</Field>
						)}
					</form.Field>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={form.state.isSubmitting || mutation.isPending}
						>
							{form.state.isSubmitting ? "Saving..." : "Save"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
