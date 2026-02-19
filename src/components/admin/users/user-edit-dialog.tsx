import {
	IconBuilding,
	IconCheck,
	IconMail,
	IconMapPin,
	IconSelector,
	IconWorld,
} from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { countries } from "countries-list";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
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

const COUNTRIES = Object.values(countries)
	.map((c) => c.name)
	.toSorted((a, b) => a.localeCompare(b));

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
	const [countryOpen, setCountryOpen] = useState(false);

	const mutation = useMutation({
		mutationFn: (data: {
			firstName: string;
			lastName: string;
			title?: string;
			affiliation?: string;
			orcid?: string;
			email: string;
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

					<form.Field name="address">
						{(field) => {
							const hasError =
								field.state.meta.isBlurred &&
								field.state.meta.errors.length > 0;
							return (
								<Field data-invalid={hasError}>
									<FieldLabel htmlFor={field.name}>Invoice address</FieldLabel>
									<div className="relative">
										<IconMapPin className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
										<textarea
											id={field.name}
											rows={2}
											aria-invalid={hasError}
											className={cn(
												"flex w-full resize-none rounded-lg border border-input bg-transparent px-3 py-2 pl-9 text-sm text-foreground transition-colors",
												"placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
												"disabled:cursor-not-allowed disabled:opacity-50",
												"aria-invalid:border-destructive aria-invalid:ring-destructive/20 aria-invalid:ring-[3px]",
											)}
											value={field.state.value || ""}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
										/>
									</div>
								</Field>
							);
						}}
					</form.Field>

					<form.Field name="country">
						{(field) => (
							<Field>
								<FieldLabel>Country</FieldLabel>
								<Popover open={countryOpen} onOpenChange={setCountryOpen}>
									<PopoverTrigger asChild>
										<Button
											variant="outline"
											role="combobox"
											aria-expanded={countryOpen}
											className={cn(
												"h-9 w-full justify-between pl-3 font-normal",
												!field.state.value && "text-muted-foreground",
											)}
										>
											<span className="flex items-center gap-2">
												<IconWorld className="size-4 text-muted-foreground" />
												{field.state.value || "Select country..."}
											</span>
											<IconSelector className="size-4 shrink-0 opacity-50" />
										</Button>
									</PopoverTrigger>
									<PopoverContent
										className="w-[--radix-popover-trigger-width] p-0"
										align="start"
									>
										<Command>
											<CommandInput placeholder="Search country..." />
											<CommandList>
												<CommandEmpty>No country found.</CommandEmpty>
												<CommandGroup>
													{COUNTRIES.map((country) => (
														<CommandItem
															key={country}
															value={country}
															onSelect={() => {
																field.handleChange(country);
																setCountryOpen(false);
															}}
														>
															<IconCheck
																className={cn(
																	"mr-2 size-4",
																	field.state.value === country
																		? "opacity-100"
																		: "opacity-0",
																)}
															/>
															{country}
														</CommandItem>
													))}
												</CommandGroup>
											</CommandList>
										</Command>
									</PopoverContent>
								</Popover>
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
