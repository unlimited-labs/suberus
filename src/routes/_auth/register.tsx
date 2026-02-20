import {
	IconArrowLeft,
	IconArrowRight,
	IconInfoCircle,
	IconMail,
	IconMapPin,
} from "@tabler/icons-react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { AffiliationSelect } from "@/components/forms/affiliation-select";
import { AuthSidebar } from "@/components/forms/auth-sidebar";
import { SurveyQuestionField } from "@/components/forms/survey/survey-question-field";
import { TosModal } from "@/components/tos-modal";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { COUNTRIES, CountryCombobox } from "@/components/ui/country-combobox";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useAppForm } from "@/hooks/use-app-form";
import { useMultiStep } from "@/hooks/use-multi-step";
import { signUp } from "@/lib/auth-client";
import { detectCountry } from "@/lib/detect-country";
import { submitForm } from "@/lib/form-utils";
import { titleOptions } from "@/lib/labels";
import { cn } from "@/lib/utils";
import {
	registerSchema,
	registerStep1Schema,
	registerStep2Schema,
	registerStep3Schema,
} from "@/lib/validations/auth";
import { checkEmailAvailableFn } from "@/utils/auth.functions";
import {
	consumeInvitationFn,
	validateInvitationTokenFn,
} from "@/utils/invitations.functions";
import {
	acceptTosFn,
	getSurveyQuestionsForRegistrationFn,
	getTosContentForRegistrationFn,
	saveUserSurveyAnswersFn,
} from "@/utils/survey.functions";

const searchSchema = z.object({
	token: z.string().optional(),
});

export const Route = createFileRoute("/_auth/register")({
	validateSearch: searchSchema,
	loaderDeps: ({ search }) => ({ token: search.token }),
	loader: async ({ deps }) => {
		const [surveyQuestions, tosContent] = await Promise.all([
			getSurveyQuestionsForRegistrationFn(),
			getTosContentForRegistrationFn(),
		]);

		let invitation: { email: string; role: string } | null = null;
		if (deps.token) {
			invitation = await validateInvitationTokenFn({
				data: { token: deps.token },
			});
		}

		return { surveyQuestions, tosContent, invitation, token: deps.token };
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

function RegisterPage() {
	const navigate = useNavigate();
	const {
		conferenceName,
		conferenceDate,
		conferenceLocation,
		conferenceSubtitle,
	} = Route.useRouteContext();
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
			address: "",
			country: detectedCountry,
			surveyAnswers: defaultSurveyAnswers,
			acceptTerms: false,
		},
		validators: {
			onChange: registerSchema,
			onSubmit: registerSchema,
		},
		onSubmit: async ({ value }) => {
			const result = await signUp.email({
				email: value.email,
				password: value.password,
				name: value.lastName,
				firstName: value.firstName,
				title: value.title || undefined,
				affiliationId: value.affiliationId || undefined,
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
				const answers = Object.entries(value.surveyAnswers).map(
					([questionId, val]) => ({ questionId, value: val }),
				);
				await Promise.all([
					saveUserSurveyAnswersFn({ data: { answers } }),
					acceptTosFn(),
				]);
			} catch {
				// Account created successfully — survey/ToS can be updated in settings
			}

			toast.success("Account created! Check your email to verify.");
			navigate({ to: "/" });
		},
	});

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
			await submitForm(form);
		}
	};

	return (
		<div className="mx-auto flex w-full max-w-4xl overflow-hidden rounded-2xl bg-card shadow-2xl">
			<AuthSidebar
				steps={[...STEPS]}
				currentStep={currentStep}
				width="wide"
				conferenceName={conferenceName}
				conferenceDate={conferenceDate}
				conferenceLocation={conferenceLocation}
				conferenceSubtitle={conferenceSubtitle}
			/>

			<div className="flex flex-1 flex-col bg-card p-5 text-foreground sm:p-6 lg:p-8">
				{/* Mobile header */}
				<div className="mb-4 lg:hidden">
					<h1 className="text-lg font-bold">{conferenceName}</h1>
					<p className="text-sm text-muted-foreground">
						Step {currentStep} of 3: {STEPS[currentStep - 1].title}
					</p>
				</div>

				{/* Desktop header */}
				<div className="mb-4 hidden lg:block">
					<h1 className="text-xl font-semibold tracking-tight">Registration</h1>
				</div>

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
												{invitation.role === "EDITOR" ? "Editor" : "Reviewer"}
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
								<p className="text-sm text-muted-foreground">
									Please provide your billing address for invoice purposes.
								</p>

								{/* Address */}
								<form.Field name="address">
									{(field) => (
										<Field>
											<FieldLabel htmlFor={field.name}>Address</FieldLabel>
											<div className="relative">
												<IconMapPin className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
												<textarea
													id={field.name}
													rows={2}
													className={cn(
														"flex w-full resize-none rounded-lg border border-input bg-transparent px-3 py-2 pl-9 text-sm transition-colors",
														"placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
														"disabled:cursor-not-allowed disabled:opacity-50",
													)}
													value={field.state.value}
													onChange={(e) => field.handleChange(e.target.value)}
												/>
											</div>
											<FieldDescription>For billing purposes</FieldDescription>
										</Field>
									)}
								</form.Field>

								{/* Country */}
								<form.Field name="country">
									{(field) => {
										const hasError =
											field.state.meta.isBlurred &&
											field.state.meta.errors.length > 0;
										return (
											<Field data-invalid={hasError}>
												<FieldLabel>Country *</FieldLabel>
												<CountryCombobox
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
							</div>
						)}

						{/* Step 3: Survey */}
						{currentStep === 3 && (
							<div className="animate-in fade-in slide-in-from-right-4 space-y-3 duration-300">
								{/* Dynamic survey questions */}
								<div className="space-y-3 rounded-lg border border-border/50 bg-muted/30 p-3">
									{surveyQuestions.length > 0 ? (
										surveyQuestions.map((question) => (
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
										))
									) : (
										<p className="text-sm text-muted-foreground">
											No additional questions at this time.
										</p>
									)}
								</div>

								{/* Terms acceptance */}
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
							<Button
								type="button"
								onClick={handleSubmit}
								disabled={form.state.isSubmitting}
								className="h-9 flex-1"
							>
								{form.state.isSubmitting
									? "Creating account..."
									: "Create account"}
							</Button>
						)}
					</div>
				</form>

				{/* Login link */}
				<p className="mt-3 text-center text-sm text-muted-foreground">
					Already have an account?{" "}
					<Link
						to="/login"
						className="font-medium text-primary hover:underline"
					>
						Sign in
					</Link>
				</p>
			</div>

			<TosModal open={tosOpen} content={tosContent} onOpenChange={setTosOpen} />
		</div>
	);
}
