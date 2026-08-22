import {
	IconBuildingStore,
	IconInfoCircle,
	IconMail,
	IconUser,
} from "@tabler/icons-react";
import { checkEmailAvailableFn } from "@/features/auth/api/auth";
import type { RegisterFormApi } from "@/features/auth/hooks/use-register-form";
import { registerBase } from "@/features/auth/validations";
import { AffiliationSelect } from "@/shared/components/affiliation-select";
import { isFieldErrorVisible } from "@/shared/hooks/use-field-error";
import { titleOptions } from "@/shared/lib/labels/title";
import { roleLabels } from "@/shared/lib/labels/user-role";
import { lookup } from "@/shared/lib/lookup";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Field, FieldError, FieldLabel } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/radio-group";

interface RegisterStep1Props {
	form: RegisterFormApi;
	invitation: { email: string; role: string } | null;
	exhibitorSignupAvailable: boolean;
	accountType: "participant" | "exhibitor";
	onAccountTypeChange: (value: "participant" | "exhibitor") => void;
}

export function RegisterStep1({
	form,
	invitation,
	exhibitorSignupAvailable,
	accountType,
	onAccountTypeChange,
}: RegisterStep1Props) {
	return (
		<div className="animate-in fade-in slide-in-from-right-4 space-y-3 duration-300">
			{/* Account type */}
			{exhibitorSignupAvailable && !invitation && (
				<Field>
					<FieldLabel>Account type</FieldLabel>
					<RadioGroup
						className="grid gap-2 sm:grid-cols-2"
						onValueChange={(value) =>
							onAccountTypeChange(
								value === "exhibitor" ? "exhibitor" : "participant",
							)
						}
						value={accountType}
					>
						<FieldLabel
							className="group border-input hover:bg-muted/50 has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/5 flex cursor-pointer items-start gap-3 rounded-lg border p-3 font-normal transition-colors"
							htmlFor="account-type-participant"
						>
							<RadioGroupItem
								className="mt-1"
								data-testid="register-account-type-participant"
								id="account-type-participant"
								value="participant"
							/>
							<span className="flex items-start gap-2.5">
								<IconUser className="text-muted-foreground group-has-data-[state=checked]:text-primary mt-0.5 size-5 shrink-0" />
								<span className="flex flex-col gap-0.5">
									<span className="font-medium">Participant / Author</span>
									<span className="text-muted-foreground text-xs">
										Submit abstracts and attend the conference
									</span>
								</span>
							</span>
						</FieldLabel>
						<FieldLabel
							className="group border-input hover:bg-muted/50 has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/5 flex cursor-pointer items-start gap-3 rounded-lg border p-3 font-normal transition-colors"
							htmlFor="account-type-exhibitor"
						>
							<RadioGroupItem
								className="mt-1"
								data-testid="register-account-type-exhibitor"
								id="account-type-exhibitor"
								value="exhibitor"
							/>
							<span className="flex items-start gap-2.5">
								<IconBuildingStore className="text-muted-foreground group-has-data-[state=checked]:text-primary mt-0.5 size-5 shrink-0" />
								<span className="flex flex-col gap-0.5">
									<span className="font-medium">Exhibitor</span>
									<span className="text-muted-foreground text-xs">
										Represent your company at the conference
									</span>
								</span>
							</span>
						</FieldLabel>
					</RadioGroup>
				</Field>
			)}

			{invitation && (
				<Alert className="border-primary/30 bg-primary/5">
					<IconInfoCircle className="text-primary size-4" />
					<AlertDescription>
						You&apos;ve been invited as{" "}
						<span className="font-semibold">
							{lookup(roleLabels, invitation.role)}
						</span>
					</AlertDescription>
				</Alert>
			)}

			{invitation ? (
				<Field>
					<FieldLabel htmlFor="invited-email">E-mail *</FieldLabel>
					<div className="relative">
						<IconMail className="text-muted-foreground pointer-events-none absolute top-2.5 left-3 size-4" />
						<Input
							className="bg-muted pl-9"
							id="invited-email"
							readOnly
							type="email"
							value={invitation.email}
						/>
					</div>
				</Field>
			) : (
				<form.AppField
					name="email"
					validators={{
						onChange: registerBase.shape.email,
						onChangeAsyncDebounceMs: 400,
						onChangeAsync: async ({ value }) => {
							const { available } = await checkEmailAvailableFn({
								data: { email: value },
							});
							return available ? undefined : "Email is already registered";
						},
					}}
				>
					{(field) => (
						<field.IconInputField
							icon={<IconMail className="size-4" />}
							label="E-mail *"
							type="email"
						/>
					)}
				</form.AppField>
			)}

			<div className="grid gap-2 sm:grid-cols-2">
				<form.AppField
					name="password"
					validators={{ onChange: registerBase.shape.password }}
				>
					{(field) => (
						<field.PasswordField
							description="Min. 10 characters"
							label="Password *"
							placeholder="Min. 10 characters"
						/>
					)}
				</form.AppField>

				<form.AppField
					name="confirmPassword"
					validators={{
						onChangeListenTo: ["password"],
						onChange: ({ value, fieldApi }) =>
							value !== fieldApi.form.getFieldValue("password")
								? "Passwords do not match"
								: undefined,
					}}
				>
					{(field) => <field.PasswordField label="Confirm Password *" />}
				</form.AppField>
			</div>

			<div className="grid gap-2 sm:grid-cols-2">
				<form.AppField
					name="firstName"
					validators={{ onChange: registerBase.shape.firstName }}
				>
					{(field) => <field.InputField label="First name *" type="text" />}
				</form.AppField>

				<form.AppField
					name="lastName"
					validators={{ onChange: registerBase.shape.lastName }}
				>
					{(field) => <field.InputField label="Last name *" type="text" />}
				</form.AppField>
			</div>

			<div className="grid gap-2 sm:grid-cols-[100px_1fr]">
				<form.AppField name="title">
					{(field) => (
						<field.SelectField label="Title" options={titleOptions} />
					)}
				</form.AppField>

				<form.Field
					name="affiliationId"
					validators={{ onChange: registerBase.shape.affiliationId }}
				>
					{(field) => {
						const hasError = isFieldErrorVisible(field.state.meta);
						return (
							<Field data-invalid={hasError}>
								<FieldLabel>Affiliation *</FieldLabel>
								<AffiliationSelect
									displayValue={form.state.values.affiliationName}
									hasError={hasError}
									onChange={(id, name) => {
										field.handleChange(id ?? "");
										form.setFieldValue("affiliationName", name);
									}}
									value={field.state.value || null}
								/>
								<FieldError
									errors={hasError ? field.state.meta.errors : undefined}
								/>
							</Field>
						);
					}}
				</form.Field>
			</div>
		</div>
	);
}
