import {
	IconArrowLeft,
	IconArrowRight,
	IconBuildingStore,
	IconInfoCircle,
	IconLock,
	IconMail,
	IconUser,
} from "@tabler/icons-react";
import { useStore } from "@tanstack/react-form";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { AffiliationSelect } from "@/components/forms/affiliation-select";
import { SurveyQuestionField } from "@/components/forms/survey/survey-question-field";
import { checkEmailAvailableFn } from "@/features/auth/api/auth";
import { AuthCard } from "@/features/auth/components/auth-card";
import { TosModal } from "@/features/auth/components/tos-modal";
import { useMultiStep } from "@/hooks/use-multi-step";
import { detectCountry } from "@/lib/detect-country";
import { titleOptions } from "@/lib/labels";
import { roleLabels } from "@/lib/labels/user";
import { registerBase, registerSchema } from "@/lib/validations/auth";
import { surveyAnswerRequiredError } from "@/lib/validations/survey";
import {
	becomeExhibitorFn,
	exhibitorSignupAvailableFn,
} from "@/server-fns/exhibitors";
import {
	consumeInvitationFn,
	validateInvitationTokenFn,
} from "@/server-fns/invitations";
import { getRegistrationStatusFn } from "@/server-fns/settings";
import {
	acceptTosFn,
	getSurveyQuestionsForRegistrationFn,
	getTosContentForRegistrationFn,
	saveUserSurveyAnswersFn,
} from "@/server-fns/settings/survey";
import { useAppForm } from "@/shared/hooks/use-app-form";
import { signUp } from "@/shared/lib/auth-client";
import { cn } from "@/shared/lib/utils";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { COUNTRIES } from "@/shared/ui/country-combobox";
import { Field, FieldError, FieldLabel } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/radio-group";

const searchSchema = z.object({
	token: z.string().optional(),
});

export const Route = createFileRoute("/_auth/register")({
	validateSearch: searchSchema,
	loaderDeps: ({ search }) => ({ token: search.token }),
	loader: async ({ deps }) => {
		const [
			surveyQuestions,
			tosContent,
			registrationStatus,
			exhibitorSignupAvailable,
		] = await Promise.all([
			getSurveyQuestionsForRegistrationFn(),
			getTosContentForRegistrationFn(),
			getRegistrationStatusFn(),
			exhibitorSignupAvailableFn(),
		]);

		let invitation: { email: string; role: string } | null = null;
		if (deps.token) {
			invitation = await validateInvitationTokenFn({
				data: { token: deps.token },
			});
		}

		// Block public registration if closed, but allow invitation-based
		const registrationClosed = registrationStatus.closed && !invitation;

		return {
			surveyQuestions,
			tosContent,
			invitation,
			token: deps.token,
			registrationClosed,
			exhibitorSignupAvailable,
		};
	},
	component: RegisterPage,
});

const STEPS = [
	{ id: 1, title: "Author Information" },
	{ id: 2, title: "Invoice Information" },
	{ id: 3, title: "Survey" },
] as const;

type RegisterField =
	| "email"
	| "password"
	| "confirmPassword"
	| "firstName"
	| "lastName"
	| "affiliationId"
	| "address"
	| "country"
	| "acceptTerms";

const STEP_FIELDS: Record<number, RegisterField[]> = {
	1: [
		"email",
		"password",
		"confirmPassword",
		"firstName",
		"lastName",
		"affiliationId",
	],
	2: ["address", "country"],
	3: ["acceptTerms"],
};

function RegistrationClosedPage() {
	return (
		<AuthCard title="Registration Closed">
			<div className="space-y-4 py-4 text-center">
				<IconLock className="mx-auto size-12 text-muted-foreground/50" />
				<p className="text-muted-foreground">
					Registration is currently closed.
				</p>
				<p className="text-sm text-muted-foreground">
					If you already have an account, you can{" "}
					<Link
						to="/login"
						className="font-medium text-primary hover:underline"
					>
						sign in
					</Link>
					.
				</p>
			</div>
		</AuthCard>
	);
}

function RegisterPage() {
	const { registrationClosed } = Route.useLoaderData();

	if (registrationClosed) {
		return <RegistrationClosedPage />;
	}

	return <RegisterForm />;
}

function RegisterForm() {
	const navigate = useNavigate();
	const {
		surveyQuestions,
		tosContent,
		invitation,
		token,
		exhibitorSignupAvailable,
	} = Route.useLoaderData();
	const [accountType, setAccountType] = useState<"participant" | "exhibitor">(
		"participant",
	);
	const detectedCountry = useMemo(() => {
		const name = detectCountry();
		return name && COUNTRIES.includes(name) ? name : "";
	}, []);
	const [tosOpen, setTosOpen] = useState(false);

	const defaultSurveyAnswers: Record<string, string> = {};
	for (const q of surveyQuestions) {
		defaultSurveyAnswers[q.id] = q.type === "CHECKBOX" ? "false" : "";
	}

	const form = useAppForm({
		defaultValues: {
			email: invitation?.email ?? "",
			password: "",
			confirmPassword: "",
			title: "",
			firstName: "",
			lastName: "",
			affiliationId: "",
			affiliationName: "",
			needInvoice: true,
			address: "",
			country: detectedCountry,
			surveyAnswers: defaultSurveyAnswers,
			acceptTerms: !tosContent,
		},
		// Full-form safety net; live + per-step checks are field-level validators.
		validators: {
			onSubmit: registerSchema,
		},
		onSubmit: async ({ value }) => {
			// Defense-in-depth: re-check registration status before submit
			if (!token) {
				const status = await getRegistrationStatusFn();
				if (status.closed) {
					toast.error("Registration is currently closed");
					return;
				}
			}

			const result = await signUp.email({
				email: value.email,
				password: value.password,
				name: value.lastName,
				firstName: value.firstName,
				title: value.title || undefined,
				affiliationId: value.affiliationId || undefined,
				needInvoice: value.needInvoice,
				address: value.address || undefined,
				country: value.country || undefined,
			} as Parameters<typeof signUp.email>[0]);

			if (result.error) {
				toast.error(result.error.message ?? "Registration failed");
				return;
			}

			// Consume invitation token if present
			if (token) {
				try {
					await consumeInvitationFn({ data: { token } });
				} catch {
					// Invitation may have already been consumed - not critical
				}
			}

			// Save survey answers + ToS acceptance (non-blocking)
			try {
				const promises: Promise<unknown>[] = [];
				const answers = Object.entries(value.surveyAnswers).map(
					([questionId, val]) => ({ questionId, value: val }),
				);
				promises.push(saveUserSurveyAnswersFn({ data: { answers } }));
				if (tosContent) promises.push(acceptTosFn());
				await Promise.all(promises);
			} catch {
				// Account created successfully — survey/ToS can be updated in settings
			}

			if (accountType === "exhibitor") {
				try {
					await becomeExhibitorFn();
					// Full page load so the client session picks up the new role
					window.location.assign("/exhibitor");
					return;
				} catch {
					toast.error(
						"Could not register as exhibitor — your account was created as a regular participant",
					);
					navigate({ to: "/" });
					return;
				}
			}

			toast.success("Account created! Check your email to verify.");
			navigate({ to: "/" });
		},
	});

	const needInvoice = useStore(form.store, (s) => s.values.needInvoice);

	// Run the current step's field-level validators (incl. async email check)
	// and reveal any errors by marking the fields blurred.
	const validateStep = useCallback(
		async (step: number): Promise<boolean> => {
			// Step 3 also gates on any required survey questions (dynamic fields).
			const surveyFields =
				step === 3
					? surveyQuestions
							.filter((q) => q.isRequired)
							.map((q) => `surveyAnswers.${q.id}` as `surveyAnswers.${string}`)
					: [];
			const fields = [...(STEP_FIELDS[step] ?? []), ...surveyFields];
			const results = await Promise.all(
				fields.map((field) => form.validateField(field, "change")),
			);
			const ok = results.every((errors) => errors.length === 0);
			if (!ok) {
				for (const field of fields) {
					form.setFieldMeta(field, (prev) => ({ ...prev, isBlurred: true }));
				}
			}
			return ok;
		},
		[form, surveyQuestions],
	);

	const { currentStep, next, prev, isFirst, isLast } = useMultiStep({
		totalSteps: 3,
		validateStep,
	});

	const handleSubmit = async () => {
		const isValid = await validateStep(3);
		if (isValid) {
			await form.handleSubmit();
		}
	};

	return (
		<AuthCard
			wide
			title="Registration"
			steps={STEPS}
			currentStep={currentStep}
			mobileHeaderExtra={
				<p className="text-sm text-muted-foreground">
					Step {currentStep} of 3: {STEPS[currentStep - 1].title}
				</p>
			}
		>
			{/* Mobile step indicator */}
			<div className="mb-4 flex gap-2 lg:hidden">
				{STEPS.map((step) => (
					<div
						key={step.id}
						className={cn(
							"h-1.5 flex-1 rounded-full transition-colors",
							step.id <= currentStep ? "bg-primary" : "bg-muted",
						)}
					/>
				))}
			</div>

			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
				}}
				className="flex flex-1 flex-col"
			>
				<div className="flex-1 space-y-3">
					{/* Step 1: Author Information */}
					{currentStep === 1 && (
						<div className="animate-in fade-in slide-in-from-right-4 space-y-3 duration-300">
							{/* Account type (only when exhibitor signup is active) */}
							{exhibitorSignupAvailable && !invitation && (
								<Field>
									<FieldLabel>Account type</FieldLabel>
									<RadioGroup
										value={accountType}
										onValueChange={(value) =>
											setAccountType(
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
													<span className="font-medium">
														Participant / Author
													</span>
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

							{/* Invitation banner */}
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

							{/* Email */}
							{invitation ? (
								<Field>
									<FieldLabel>E-mail *</FieldLabel>
									<div className="relative">
										<IconMail className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
										<Input
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
											return available
												? undefined
												: "Email is already registered";
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

							{/* Password fields */}
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
									{(field) => (
										<field.PasswordField label="Confirm Password *" />
									)}
								</form.AppField>
							</div>

							{/* Name fields */}
							<div className="grid gap-2 sm:grid-cols-2">
								<form.AppField
									name="firstName"
									validators={{ onChange: registerBase.shape.firstName }}
								>
									{(field) => (
										<field.InputField label="First name *" type="text" />
									)}
								</form.AppField>

								<form.AppField
									name="lastName"
									validators={{ onChange: registerBase.shape.lastName }}
								>
									{(field) => (
										<field.InputField label="Last name *" type="text" />
									)}
								</form.AppField>
							</div>

							{/* Title + Affiliation */}
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
											field.state.meta.isBlurred &&
											field.state.meta.errors.length > 0;
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
													errors={
														hasError ? field.state.meta.errors : undefined
													}
												/>
											</Field>
										);
									}}
								</form.Field>
							</div>
						</div>
					)}

					{/* Step 2: Invoice Information */}
					{currentStep === 2 && (
						<div className="animate-in fade-in slide-in-from-right-4 space-y-3 duration-300">
							{/* Need Invoice checkbox */}
							<form.AppField name="needInvoice">
								{(field) => (
									<field.CheckboxField label="I need an invoice for my organization" />
								)}
							</form.AppField>

							{/* Billing details (visible when invoice needed) */}
							{needInvoice && (
								<form.AppField
									name="address"
									validators={{
										onChangeListenTo: ["needInvoice"],
										onChange: ({ value, fieldApi }) =>
											fieldApi.form.getFieldValue("needInvoice") &&
											value.trim().length === 0
												? "Billing details are required when invoice is needed"
												: undefined,
									}}
								>
									{(field) => (
										<field.TextareaField
											label="Billing details (organization) *"
											rows={3}
											placeholder="Company/organization name, billing address, VAT/Tax ID (if applicable)"
										/>
									)}
								</form.AppField>
							)}

							{/* Country */}
							<form.AppField
								name="country"
								validators={{ onChange: registerBase.shape.country }}
							>
								{(field) => <field.CountryComboboxField label="Country *" />}
							</form.AppField>
						</div>
					)}

					{/* Step 3: Survey */}
					{currentStep === 3 && (
						<div className="animate-in fade-in slide-in-from-right-4 space-y-3 duration-300">
							{/* Dynamic survey questions */}
							{surveyQuestions.length > 0 && (
								<div className="space-y-3 rounded-lg border border-border/50 bg-muted/30 p-3">
									{surveyQuestions.map((question) => (
										<form.Field
											key={question.id}
											name={
												`surveyAnswers.${question.id}` as `surveyAnswers.${string}`
											}
											validators={{
												onChange: ({ value }) =>
													surveyAnswerRequiredError(question, value),
											}}
										>
											{(field) => {
												const hasError =
													field.state.meta.isBlurred &&
													field.state.meta.errors.length > 0;
												return (
													<Field data-invalid={hasError}>
														<SurveyQuestionField
															question={question}
															value={field.state.value}
															onChange={field.handleChange}
														/>
														<FieldError
															errors={
																hasError ? field.state.meta.errors : undefined
															}
														/>
													</Field>
												);
											}}
										</form.Field>
									))}
								</div>
							)}

							{/* Terms acceptance */}
							{tosContent && (
								<form.Field
									name="acceptTerms"
									validators={{ onChange: registerBase.shape.acceptTerms }}
								>
									{(field) => {
										const hasError =
											field.state.meta.isBlurred &&
											field.state.meta.errors.length > 0;
										return (
											<Field
												data-invalid={hasError}
												className="rounded-lg border border-primary/20 bg-primary/5 p-3"
											>
												<div className="flex items-start gap-2">
													<Checkbox
														id={field.name}
														checked={field.state.value}
														onCheckedChange={(checked) =>
															field.handleChange(checked === true)
														}
														className="mt-0.5"
													/>
													<FieldLabel
														htmlFor={field.name}
														className="cursor-pointer text-sm font-normal leading-snug"
													>
														I agree to the{" "}
														<button
															type="button"
															className="text-primary hover:underline"
															onClick={(e) => {
																e.preventDefault();
																setTosOpen(true);
															}}
														>
															Terms of Service
														</button>{" "}
														*
													</FieldLabel>
												</div>
												<FieldError
													errors={
														hasError ? field.state.meta.errors : undefined
													}
												/>
											</Field>
										);
									}}
								</form.Field>
							)}
						</div>
					)}
				</div>

				{/* Navigation buttons */}
				<div className="mt-4 flex gap-2">
					{!isFirst && (
						<Button
							type="button"
							variant="outline"
							onClick={prev}
							className="h-9 flex-1"
						>
							<IconArrowLeft className="mr-2 size-4" />
							Back
						</Button>
					)}

					{!isLast ? (
						<Button type="button" onClick={next} className="h-9 flex-1">
							Continue
							<IconArrowRight className="ml-2 size-4" />
						</Button>
					) : (
						<form.Subscribe selector={(s) => s.isSubmitting}>
							{(isSubmitting) => (
								<Button
									type="button"
									onClick={handleSubmit}
									disabled={isSubmitting}
									className="h-9 flex-1"
								>
									{isSubmitting ? "Creating account..." : "Create account"}
								</Button>
							)}
						</form.Subscribe>
					)}
				</div>
			</form>

			{/* Login link */}
			<p className="mt-3 text-center text-sm text-muted-foreground">
				Already have an account?{" "}
				<Link to="/login" className="font-medium text-primary hover:underline">
					Sign in
				</Link>
			</p>

			{tosContent && (
				<TosModal
					open={tosOpen}
					content={tosContent}
					onOpenChange={setTosOpen}
				/>
			)}
		</AuthCard>
	);
}
