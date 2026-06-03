import {
	IconArrowLeft,
	IconArrowRight,
	IconInfoCircle,
	IconLock,
	IconMail,
} from "@tabler/icons-react";
import { useStore } from "@tanstack/react-form";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { AffiliationSelect } from "@/components/forms/affiliation-select";
import { SurveyQuestionField } from "@/components/forms/survey/survey-question-field";
import { AuthCard } from "@/components/layout/auth-card";
import { TosModal } from "@/components/tos-modal";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { COUNTRIES } from "@/components/ui/country-combobox";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useAppForm } from "@/hooks/use-app-form";
import { useMultiStep } from "@/hooks/use-multi-step";
import { signUp } from "@/lib/auth-client";
import { detectCountry } from "@/lib/detect-country";
import { titleOptions } from "@/lib/labels";
import { roleLabels } from "@/lib/labels/user";
import { cn } from "@/lib/utils";
import {
	registerSchema,
	registerStep1Schema,
	registerStep2Schema,
	registerStep3Schema,
} from "@/lib/validations/auth";
import { checkEmailAvailableFn } from "@/server-fns/auth";
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

const searchSchema = z.object({
	token: z.string().optional(),
});

export const Route = createFileRoute("/_auth/register")({
	validateSearch: searchSchema,
	loaderDeps: ({ search }) => ({ token: search.token }),
	loader: async ({ deps }) => {
		const [surveyQuestions, tosContent, registrationStatus] = await Promise.all(
			[
				getSurveyQuestionsForRegistrationFn(),
				getTosContentForRegistrationFn(),
				getRegistrationStatusFn(),
			],
		);

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
		};
	},
	component: RegisterPage,
});

const STEPS = [
	{ id: 1, title: "Author Information" },
	{ id: 2, title: "Invoice Information" },
	{ id: 3, title: "Survey" },
] as const;

const stepSchemas = [
	registerStep1Schema,
	registerStep2Schema,
	registerStep3Schema,
];

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
	const { surveyQuestions, tosContent, invitation, token } =
		Route.useLoaderData();
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
		validators: {
			onChange: registerSchema,
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

			toast.success("Account created! Check your email to verify.");
			navigate({ to: "/" });
		},
	});

	const needInvoice = useStore(form.store, (s) => s.values.needInvoice);

	const validateStep = useCallback(
		async (step: number): Promise<boolean> => {
			const schema = stepSchemas[step - 1];
			const result = schema.safeParse(form.state.values);

			if (result.success) {
				// Check email uniqueness on step 1
				if (step === 1 && !invitation) {
					const { available } = await checkEmailAvailableFn({
						data: { email: form.state.values.email },
					});
					if (!available) {
						form.setFieldMeta("email", (prev) => ({
							...prev,
							isTouched: true,
							isBlurred: true,
							errorMap: {
								...prev.errorMap,
								onChange: "Email is already registered",
							},
							errorSourceMap: {
								...prev.errorSourceMap,
								onChange: "form",
							},
						}));
						return false;
					}
				}
				return true;
			}

			// Touch fields with errors and set errorMap so errors are visible.
			// Setting errorSourceMap to 'form' ensures the form-level onChange
			// validator can clear these errors when the user fixes the field.
			const seen = new Set<string>();
			for (const issue of result.error.issues) {
				const fieldName = issue.path.join(".") as Parameters<
					typeof form.setFieldMeta
				>[0];
				if (fieldName && !seen.has(fieldName)) {
					seen.add(fieldName);
					form.setFieldMeta(fieldName, (prev) => ({
						...prev,
						isTouched: true,
						isBlurred: true,
						errorMap: {
							...prev.errorMap,
							onChange: issue.message,
						},
						errorSourceMap: {
							...prev.errorSourceMap,
							onChange: "form",
						},
					}));
				}
			}
			return false;
		},
		[form, invitation],
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
								<form.AppField name="email">
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
								<form.AppField name="password">
									{(field) => (
										<field.PasswordField
											label="Password *"
											placeholder="Min. 10 characters"
											description="Min. 10 characters"
										/>
									)}
								</form.AppField>

								<form.AppField name="confirmPassword">
									{(field) => (
										<field.PasswordField label="Confirm Password *" />
									)}
								</form.AppField>
							</div>

							{/* Name fields */}
							<div className="grid gap-2 sm:grid-cols-2">
								<form.AppField name="firstName">
									{(field) => (
										<field.InputField label="First name *" type="text" />
									)}
								</form.AppField>

								<form.AppField name="lastName">
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

								<form.Field name="affiliationId">
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
								<form.AppField name="address">
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
							<form.AppField name="country">
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
										>
											{(field) => (
												<SurveyQuestionField
													question={question}
													value={field.state.value}
													onChange={field.handleChange}
												/>
											)}
										</form.Field>
									))}
								</div>
							)}

							{/* Terms acceptance */}
							{tosContent && (
								<form.Field name="acceptTerms">
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
