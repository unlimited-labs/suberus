import {
	IconArrowLeft,
	IconArrowRight,
	IconCheck,
	IconMail,
	IconMapPin,
	IconSelector,
	IconWorld,
} from "@tabler/icons-react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { countries } from "countries-list";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { AffiliationSelect } from "@/components/forms/affiliation-select";
import { AuthSidebar } from "@/components/forms/auth-sidebar";
import { FieldError } from "@/components/forms/field-error";
import { PasswordInput } from "@/components/forms/password-input";
import { TosModal } from "@/components/tos-modal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { useAppForm } from "@/hooks/use-app-form";
import { useMultiStep } from "@/hooks/use-multi-step";
import { useZodFormFieldOnChange } from "@/hooks/use-zod-form-field";
import { signUp } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import {
	acceptTosFn,
	getSurveyQuestionsForRegistrationFn,
	getTosContentForRegistrationFn,
	saveUserSurveyAnswersFn,
} from "@/utils/survey.functions";

export const Route = createFileRoute("/_auth/register")({
	loader: async () => {
		const [surveyQuestions, tosContent] = await Promise.all([
			getSurveyQuestionsForRegistrationFn(),
			getTosContentForRegistrationFn(),
		]);
		return { surveyQuestions, tosContent };
	},
	component: RegisterPage,
});

const emailSchema = z.email("Invalid email address");
const passwordSchema = z
	.string()
	.min(1, "Password is required")
	.min(10, "Password must be at least 10 characters");
const requiredString = (field: string) =>
	z.string().min(1, `${field} is required`);

const TITLE_OPTIONS = [
	{ value: "mr", label: "Mr." },
	{ value: "ms", label: "Ms." },
	{ value: "msc", label: "M.Sc." },
	{ value: "dr", label: "Dr." },
	{ value: "prof", label: "Prof." },
] as const;

const STEPS = [
	{ id: 1, title: "Author Information" },
	{ id: 2, title: "Invoice Information" },
	{ id: 3, title: "Survey" },
] as const;

const COUNTRIES = Object.values(countries)
	.map((c) => c.name)
	.toSorted((a, b) => a.localeCompare(b));

type FormData = {
	email: string;
	password: string;
	confirmPassword: string;
	title: string;
	firstName: string;
	lastName: string;
	affiliationId: string;
	affiliationName: string;
	address: string;
	country: string;
	surveyAnswers: Record<string, boolean>;
	acceptTerms: boolean;
};

function RegisterPage() {
	const navigate = useNavigate();
	const {
		conferenceName,
		conferenceDate,
		conferenceLocation,
		conferenceSubtitle,
	} = Route.useRouteContext();
	const { surveyQuestions, tosContent } = Route.useLoaderData();
	const [countryOpen, setCountryOpen] = useState(false);
	const [tosOpen, setTosOpen] = useState(false);

	const defaultSurveyAnswers: Record<string, boolean> = {};
	for (const q of surveyQuestions) {
		defaultSurveyAnswers[q.id] = false;
	}

	const form = useAppForm({
		defaultValues: {
			email: "",
			password: "",
			confirmPassword: "",
			title: "",
			firstName: "",
			lastName: "",
			affiliationId: "",
			affiliationName: "",
			address: "",
			country: "",
			surveyAnswers: defaultSurveyAnswers,
			acceptTerms: false,
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
			const fieldsToValidate: (keyof FormData)[] =
				step === 1
					? [
							"email",
							"password",
							"confirmPassword",
							"firstName",
							"lastName",
							"affiliationId",
						]
					: step === 2
						? ["country"]
						: ["acceptTerms"];

			for (const fieldName of fieldsToValidate) {
				await form.validateField(fieldName, "submit");
			}

			return !fieldsToValidate.some((fieldName) => {
				const field = form.getFieldMeta(fieldName);
				return field?.errors && field.errors.length > 0;
			});
		},
		[form],
	);

	const {
		currentStep,
		next,
		prev,
		isFirst,
		isLast,
		isValidationAttempted,
		markValidationAttempted,
	} = useMultiStep({
		totalSteps: 3,
		validateStep,
	});

	const emailValidators = useZodFormFieldOnChange(
		emailSchema,
		isValidationAttempted,
	);
	const passwordValidators = useZodFormFieldOnChange(
		passwordSchema,
		isValidationAttempted,
	);
	const firstNameValidators = useZodFormFieldOnChange(
		requiredString("First name"),
		isValidationAttempted,
	);
	const lastNameValidators = useZodFormFieldOnChange(
		requiredString("Last name"),
		isValidationAttempted,
	);
	const affiliationIdValidators = useZodFormFieldOnChange(
		requiredString("Affiliation"),
		isValidationAttempted,
	);
	const countryValidators = useZodFormFieldOnChange(
		requiredString("Country"),
		isValidationAttempted,
	);

	const handleSubmit = async () => {
		markValidationAttempted(3);
		const isValid = await validateStep(3);
		if (isValid) {
			await form.handleSubmit();
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
								{/* Email */}
								<form.AppField name="email" validators={emailValidators}>
									{(field) => (
										<field.IconInputField
											label="E-mail *"
											type="email"
											icon={<IconMail className="size-4" />}
										/>
									)}
								</form.AppField>

								{/* Password fields */}
								<div className="grid gap-2 sm:grid-cols-2">
									<form.AppField
										name="password"
										validators={passwordValidators}
									>
										{(field) => (
											<field.PasswordField
												label="Password *"
												placeholder="Min. 10 characters"
											/>
										)}
									</form.AppField>

									<form.Field
										name="confirmPassword"
										validators={{
											onSubmit: ({ value, fieldApi }) => {
												if (!value) return "Confirm password";
												const password =
													fieldApi.form.getFieldValue("password");
												if (value !== password) return "Passwords do not match";
												return undefined;
											},
											onChange: ({ value, fieldApi }) => {
												if (!isValidationAttempted) return undefined;
												if (!value) return "Confirm password";
												const password =
													fieldApi.form.getFieldValue("password");
												if (value !== password) return "Passwords do not match";
												return undefined;
											},
										}}
									>
										{(field) => (
											<div className="space-y-1">
												<Label htmlFor={field.name}>Confirm Password *</Label>
												<PasswordInput
													id={field.name}
													hasError={field.state.meta.errors.length > 0}
													value={field.state.value}
													onBlur={field.handleBlur}
													onChange={(value) => field.handleChange(value)}
												/>
												<FieldError errors={field.state.meta.errors} />
											</div>
										)}
									</form.Field>
								</div>

								{/* Name fields */}
								<div className="grid gap-2 sm:grid-cols-2">
									<form.AppField
										name="firstName"
										validators={firstNameValidators}
									>
										{(field) => (
											<field.InputField label="First name *" type="text" />
										)}
									</form.AppField>

									<form.AppField
										name="lastName"
										validators={lastNameValidators}
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
											<field.SelectField
												label="Title"
												options={TITLE_OPTIONS}
											/>
										)}
									</form.AppField>

									<form.Field
										name="affiliationId"
										validators={affiliationIdValidators}
									>
										{(field) => (
											<div className="space-y-1">
												<Label>Affiliation *</Label>
												<AffiliationSelect
													value={field.state.value || null}
													displayValue={form.state.values.affiliationName}
													onChange={(id, name) => {
														field.handleChange(id ?? "");
														form.setFieldValue("affiliationName", name);
													}}
													hasError={field.state.meta.errors.length > 0}
												/>
												<FieldError errors={field.state.meta.errors} />
											</div>
										)}
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
										<div className="space-y-1">
											<Label htmlFor={field.name}>Address</Label>
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
										</div>
									)}
								</form.Field>

								{/* Country */}
								<form.Field name="country" validators={countryValidators}>
									{(field) => (
										<div className="space-y-1">
											<Label>Country *</Label>
											<Popover open={countryOpen} onOpenChange={setCountryOpen}>
												<PopoverTrigger asChild>
													<Button
														variant="outline"
														role="combobox"
														aria-expanded={countryOpen}
														className={cn(
															"h-9 w-full justify-between pl-3 font-normal",
															!field.state.value && "text-muted-foreground",
															field.state.meta.errors.length > 0 &&
																"border-destructive",
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
											<FieldError errors={field.state.meta.errors} />
										</div>
									)}
								</form.Field>
							</div>
						)}

						{/* Step 3: Survey */}
						{currentStep === 3 && (
							<div className="animate-in fade-in slide-in-from-right-4 space-y-3 duration-300">
								<p className="text-sm text-muted-foreground">
									Please let us know if you need any additional documents.
								</p>

								{/* Dynamic survey checkboxes */}
								<div className="space-y-2 rounded-lg border border-border/50 bg-muted/30 p-3">
									{surveyQuestions.length > 0 ? (
										surveyQuestions.map((question) => (
											<form.AppField
												key={question.id}
												name={
													`surveyAnswers.${question.id}` as `surveyAnswers.${string}`
												}
											>
												{(field) => (
													<field.CheckboxField
														label={question.label}
														labelClassName="cursor-pointer text-sm font-normal leading-snug"
														className="flex items-start gap-3"
													/>
												)}
											</form.AppField>
										))
									) : (
										<p className="text-sm text-muted-foreground">
											No additional questions at this time.
										</p>
									)}
								</div>

								{/* Terms acceptance */}
								<form.Field
									name="acceptTerms"
									validators={{
										onSubmit: ({ value }) => {
											if (!value) return "You must accept the Terms of Service";
											return undefined;
										},
										onChange: ({ value }) => {
											if (!isValidationAttempted) return undefined;
											if (!value) return "You must accept the Terms of Service";
											return undefined;
										},
									}}
								>
									{(field) => (
										<div className="space-y-1 rounded-lg border border-primary/20 bg-primary/5 p-3">
											<div className="flex items-start gap-2">
												<Checkbox
													id={field.name}
													checked={field.state.value}
													onCheckedChange={(checked) =>
														field.handleChange(checked === true)
													}
													className="mt-0.5"
												/>
												<Label
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
												</Label>
											</div>
											<FieldError errors={field.state.meta.errors} />
										</div>
									)}
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
