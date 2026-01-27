import { useState, useCallback } from "react"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { useForm } from "@tanstack/react-form"
import {
	IconMail,
	IconWorld,
	IconMapPin,
	IconArrowRight,
	IconArrowLeft,
	IconCheck,
	IconSelector,
} from "@tabler/icons-react"
import { z } from "zod"
import { countries } from "countries-list"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover"
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command"
import { cn } from "@/lib/utils"
import { AuthSidebar } from "@/components/forms/auth-sidebar"
import { IconInput } from "@/components/forms/icon-input"
import { PasswordInput } from "@/components/forms/password-input"
import { FieldError } from "@/components/forms/field-error"
import { AffiliationSelect } from "@/components/forms/affiliation-select"
import { useMultiStep } from "@/hooks/use-multi-step"
import { useZodFormFieldOnChange } from "@/hooks/use-zod-form-field"
import { signUp } from "@/lib/auth-client"

export const Route = createFileRoute("/_auth/register")({
	component: RegisterPage,
})

const emailSchema = z.string().min(1, "Email is required").email("Invalid email address")
const passwordSchema = z
	.string()
	.min(1, "Password is required")
	.min(10, "Password must be at least 10 characters")
const requiredString = (field: string) => z.string().min(1, `${field} is required`)

const TITLE_OPTIONS = [
	{ value: "mr", label: "Mr." },
	{ value: "ms", label: "Ms." },
	{ value: "msc", label: "M.Sc." },
	{ value: "dr", label: "Dr." },
	{ value: "prof", label: "Prof." },
] as const

const STEPS = [
	{ id: 1, title: "Author Information" },
	{ id: 2, title: "Invoice Information" },
	{ id: 3, title: "Survey" },
] as const

const COUNTRIES = Object.values(countries)
	.map((c) => c.name)
	.toSorted((a, b) => a.localeCompare(b))

type FormData = {
	email: string
	password: string
	confirmPassword: string
	title: string
	firstName: string
	lastName: string
	affiliationId: string
	affiliationName: string
	address: string
	country: string
	needsVisaLetter: boolean
	needsCertificate: boolean
	acceptTerms: boolean
}

function RegisterPage() {
	const navigate = useNavigate()
	const [countryOpen, setCountryOpen] = useState(false)

	const form = useForm<FormData>({
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
			needsVisaLetter: false,
			needsCertificate: false,
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
			})

			if (result.error) {
				toast.error(result.error.message ?? "Registration failed")
				return
			}

			toast.success("Account created successfully")
			navigate({ to: "/" })
		},
	})

	const validateStep = useCallback(
		async (step: number): Promise<boolean> => {
			const fieldsToValidate: (keyof FormData)[] =
				step === 1
					? ["email", "password", "confirmPassword", "firstName", "lastName", "affiliationId"]
					: step === 2
						? ["country"]
						: ["acceptTerms"]

			for (const fieldName of fieldsToValidate) {
				await form.validateField(fieldName, "submit")
			}

			return !fieldsToValidate.some((fieldName) => {
				const field = form.getFieldMeta(fieldName)
				return field?.errors && field.errors.length > 0
			})
		},
		[form]
	)

	const { currentStep, next, prev, isFirst, isLast, isValidationAttempted, markValidationAttempted } =
		useMultiStep({
			totalSteps: 3,
			validateStep,
		})

	const emailValidators = useZodFormFieldOnChange(emailSchema, isValidationAttempted)
	const passwordValidators = useZodFormFieldOnChange(passwordSchema, isValidationAttempted)
	const firstNameValidators = useZodFormFieldOnChange(
		requiredString("First name"),
		isValidationAttempted
	)
	const lastNameValidators = useZodFormFieldOnChange(
		requiredString("Last name"),
		isValidationAttempted
	)
	const affiliationIdValidators = useZodFormFieldOnChange(
		requiredString("Affiliation"),
		isValidationAttempted
	)
	const countryValidators = useZodFormFieldOnChange(requiredString("Country"), isValidationAttempted)

	const handleSubmit = async () => {
		markValidationAttempted(3)
		const isValid = await validateStep(3)
		if (isValid) {
			await form.handleSubmit()
		}
	}

	return (
		<div className="mx-auto flex w-full max-w-4xl overflow-hidden rounded-2xl bg-card shadow-2xl">
			<AuthSidebar steps={[...STEPS]} currentStep={currentStep} width="wide" />

			<div className="flex flex-1 flex-col bg-card p-5 text-foreground sm:p-6 lg:p-8">
				{/* Mobile header */}
				<div className="mb-4 lg:hidden">
					<h1 className="text-lg font-bold">KomPlasTech 2025</h1>
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
								step.id <= currentStep ? "bg-primary" : "bg-muted"
							)}
						/>
					))}
				</div>

				<form
					onSubmit={(e) => {
						e.preventDefault()
						e.stopPropagation()
					}}
					className="flex flex-1 flex-col"
				>
					<div className="flex-1 space-y-3">
						{/* Step 1: Author Information */}
						{currentStep === 1 && (
							<div className="animate-in fade-in slide-in-from-right-4 space-y-3 duration-300">
								{/* Email */}
								<form.Field name="email" validators={emailValidators}>
									{(field) => (
										<div className="space-y-1">
											<Label htmlFor={field.name}>E-mail *</Label>
											<IconInput
												id={field.name}
												type="email"
												icon={<IconMail className="size-4" />}
												hasError={field.state.meta.errors.length > 0}
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
											/>
											<FieldError errors={field.state.meta.errors} />
										</div>
									)}
								</form.Field>

								{/* Password fields */}
								<div className="grid gap-2 sm:grid-cols-2">
									<form.Field name="password" validators={passwordValidators}>
										{(field) => (
											<div className="space-y-1">
												<Label htmlFor={field.name}>Password *</Label>
												<PasswordInput
													id={field.name}
													placeholder="Min. 10 characters"
													hasError={field.state.meta.errors.length > 0}
													value={field.state.value}
													onBlur={field.handleBlur}
													onChange={(value) => field.handleChange(value)}
												/>
												<FieldError errors={field.state.meta.errors} />
											</div>
										)}
									</form.Field>

									<form.Field
										name="confirmPassword"
										validators={{
											onSubmit: ({ value, fieldApi }) => {
												if (!value) return "Confirm password"
												const password = fieldApi.form.getFieldValue("password")
												if (value !== password) return "Passwords do not match"
												return undefined
											},
											onChange: ({ value, fieldApi }) => {
												if (!isValidationAttempted) return undefined
												if (!value) return "Confirm password"
												const password = fieldApi.form.getFieldValue("password")
												if (value !== password) return "Passwords do not match"
												return undefined
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
									<form.Field name="firstName" validators={firstNameValidators}>
										{(field) => (
											<div className="space-y-1">
												<Label htmlFor={field.name}>First name *</Label>
												<Input
													id={field.name}
													type="text"
													className={cn(
														"h-9",
														field.state.meta.errors.length > 0 && "border-destructive"
													)}
													value={field.state.value}
													onBlur={field.handleBlur}
													onChange={(e) => field.handleChange(e.target.value)}
												/>
												<FieldError errors={field.state.meta.errors} />
											</div>
										)}
									</form.Field>

									<form.Field name="lastName" validators={lastNameValidators}>
										{(field) => (
											<div className="space-y-1">
												<Label htmlFor={field.name}>Last name *</Label>
												<Input
													id={field.name}
													type="text"
													className={cn(
														"h-9",
														field.state.meta.errors.length > 0 && "border-destructive"
													)}
													value={field.state.value}
													onBlur={field.handleBlur}
													onChange={(e) => field.handleChange(e.target.value)}
												/>
												<FieldError errors={field.state.meta.errors} />
											</div>
										)}
									</form.Field>
								</div>

								{/* Title + Affiliation */}
								<div className="grid gap-2 sm:grid-cols-[100px_1fr]">
									<form.Field name="title">
										{(field) => (
											<div className="space-y-1">
												<Label htmlFor={field.name}>Title</Label>
												<Select
													value={field.state.value}
													onValueChange={(value) => field.handleChange(value)}
												>
													<SelectTrigger className="h-9">
														<SelectValue placeholder="—" />
													</SelectTrigger>
													<SelectContent>
														{TITLE_OPTIONS.map((option) => (
															<SelectItem key={option.value} value={option.value}>
																{option.label}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											</div>
										)}
									</form.Field>

									<form.Field name="affiliationId" validators={affiliationIdValidators}>
										{(field) => (
											<div className="space-y-1">
												<Label>Affiliation *</Label>
												<AffiliationSelect
													value={field.state.value || null}
													displayValue={form.state.values.affiliationName}
													onChange={(id, name) => {
														field.handleChange(id ?? "")
														form.setFieldValue("affiliationName", name)
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
														"disabled:cursor-not-allowed disabled:opacity-50"
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
															field.state.meta.errors.length > 0 && "border-destructive"
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
																			field.handleChange(country)
																			setCountryOpen(false)
																		}}
																	>
																		<IconCheck
																			className={cn(
																				"mr-2 size-4",
																				field.state.value === country
																					? "opacity-100"
																					: "opacity-0"
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

								{/* Survey checkboxes */}
								<div className="space-y-2 rounded-lg border border-border/50 bg-muted/30 p-3">
									<form.Field name="needsVisaLetter">
										{(field) => (
											<div className="flex items-start gap-3">
												<Checkbox
													id={field.name}
													checked={field.state.value}
													onCheckedChange={(checked) => field.handleChange(checked === true)}
													className="mt-0.5"
												/>
												<Label
													htmlFor={field.name}
													className="cursor-pointer text-sm font-normal leading-snug"
												>
													Please send me an Invitation Letter for a Visa Application.
												</Label>
											</div>
										)}
									</form.Field>

									<form.Field name="needsCertificate">
										{(field) => (
											<div className="flex items-start gap-3">
												<Checkbox
													id={field.name}
													checked={field.state.value}
													onCheckedChange={(checked) => field.handleChange(checked === true)}
													className="mt-0.5"
												/>
												<Label
													htmlFor={field.name}
													className="cursor-pointer text-sm font-normal leading-snug"
												>
													I need a certificate of attendance.
												</Label>
											</div>
										)}
									</form.Field>
								</div>

								{/* Terms acceptance */}
								<form.Field
									name="acceptTerms"
									validators={{
										onSubmit: ({ value }) => {
											if (!value) return "You must accept the terms and conditions"
											return undefined
										},
										onChange: ({ value }) => {
											if (!isValidationAttempted) return undefined
											if (!value) return "You must accept the terms and conditions"
											return undefined
										},
									}}
								>
									{(field) => (
										<div className="space-y-1 rounded-lg border border-primary/20 bg-primary/5 p-3">
											<div className="flex items-start gap-2">
												<Checkbox
													id={field.name}
													checked={field.state.value}
													onCheckedChange={(checked) => field.handleChange(checked === true)}
													className="mt-0.5"
												/>
												<Label
													htmlFor={field.name}
													className="cursor-pointer text-sm font-normal leading-snug"
												>
													I agree to the{" "}
													<Link to="/" className="text-primary hover:underline">
														Terms of Service
													</Link>{" "}
													and{" "}
													<Link to="/" className="text-primary hover:underline">
														Privacy Policy
													</Link>{" "}
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
							<Button type="button" variant="outline" onClick={prev} className="h-9 flex-1">
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
								{form.state.isSubmitting ? "Creating account..." : "Create account"}
							</Button>
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
			</div>
		</div>
	)
}
