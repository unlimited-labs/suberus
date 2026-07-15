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
import { titleOptions } from "@/shared/lib/labels/title";
import { roleLabels } from "@/shared/lib/labels/user-role";
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
						value={accountType}
						onValueChange={(value) =>
							onAccountTypeChange(
								value === "exhibitor" ? "exhibitor" : "participant",
							)
						}
						className="grid gap-2 sm:grid-cols-2"
					>
						<FieldLabel
							htmlFor="account-type-participant"
							className="group flex cursor-pointer items-start gap-3 rounded-lg border border-input p-3 font-normal transition-colors hover:bg-muted/50 has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/5"
						>
							<RadioGroupItem
								value="participant"
								id="account-type-participant"
								data-testid="register-account-type-participant"
								className="mt-1"
							/>
							<span className="flex items-start gap-2.5">
								<IconUser className="mt-0.5 size-5 shrink-0 text-muted-foreground group-has-data-[state=checked]:text-primary" />
								<span className="flex flex-col gap-0.5">
									<span className="font-medium">Participant / Author</span>
									<span className="text-xs text-muted-foreground">
										Submit abstracts and attend the conference
									</span>
								</span>
							</span>
						</FieldLabel>
						<FieldLabel
							htmlFor="account-type-exhibitor"
							className="group flex cursor-pointer items-start gap-3 rounded-lg border border-input p-3 font-normal transition-colors hover:bg-muted/50 has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/5"
						>
							<RadioGroupItem
								value="exhibitor"
								id="account-type-exhibitor"
								data-testid="register-account-type-exhibitor"
								className="mt-1"
							/>
							<span className="flex items-start gap-2.5">
								<IconBuildingStore className="mt-0.5 size-5 shrink-0 text-muted-foreground group-has-data-[state=checked]:text-primary" />
								<span className="flex flex-col gap-0.5">
									<span className="font-medium">Exhibitor</span>
									<span className="text-xs text-muted-foreground">
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
					<IconInfoCircle className="size-4 text-primary" />
					<AlertDescription>
						You&apos;ve been invited as{" "}
						<span className="font-semibold">
							{roleLabels[invitation.role as keyof typeof roleLabels]}
						</span>
					</AlertDescription>
				</Alert>
			)}

			{invitation ? (
				<Field>
					<FieldLabel htmlFor="invited-email">E-mail *</FieldLabel>
					<div className="relative">
						<IconMail className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
						<Input
							id="invited-email"
							type="email"
							value={invitation.email}
							readOnly
							className="bg-muted pl-9"
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
							label="E-mail *"
							type="email"
							icon={<IconMail className="size-4" />}
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
							label="Password *"
							placeholder="Min. 10 characters"
							description="Min. 10 characters"
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
						const hasError =
							field.state.meta.isBlurred && field.state.meta.errors.length > 0;
						return (
							<Field data-invalid={hasError}>
								<FieldLabel>Affiliation *</FieldLabel>
								<AffiliationSelect
									value={field.state.value || null}
									displayValue={form.state.values.affiliationName}
									onChange={(id, name) => {
										field.handleChange(id ?? "");
										form.setFieldValue("affiliationName", name);
									}}
									hasError={hasError}
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
