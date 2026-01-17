import { useState } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useForm } from "@tanstack/react-form"
import {
	IconMail,
	IconLock,
	IconEye,
	IconEyeOff,
	IconBuilding,
	IconWorld,
	IconMapPin,
	IconArrowRight,
	IconArrowLeft,
	IconCheck,
	IconSelector,
} from "@tabler/icons-react"
import { z } from "zod"
import { countries } from "countries-list"

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
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/_auth/register")({
	component: RegisterPage,
})

// Validation schemas
const emailSchema = z.string().min(1, "Email is required").email("Invalid email address")
const passwordSchema = z.string().min(1, "Password is required").min(10, "Password must be at least 10 characters")
const requiredString = (field: string) => z.string().min(1, `${field} is required`)

// Mock configurable content
const REGISTRATION_INFO = `Complete the form below in order to register for the KomPlasTech 2025 Conference in Krynica Zdrój, March 2-5, 2025. If you experience any problems with the site, you may wish to try another browser. If you continue to have problems, please contact us at barana@agh.edu.pl.`

const TITLE_OPTIONS = [
	{ value: "mr", label: "Mr." },
	{ value: "ms", label: "Ms." },
	{ value: "msc", label: "M.Sc." },
	{ value: "dr", label: "Dr." },
	{ value: "prof", label: "Prof." },
] as const

const STEPS = [
	{ id: 1, title: "Author Information", description: "Your account and personal details" },
	{ id: 2, title: "Invoice Information", description: "Billing address details" },
	{ id: 3, title: "Survey", description: "Additional preferences" },
] as const

const COUNTRIES = Object.values(countries)
	.map((c) => c.name)
	.sort((a, b) => a.localeCompare(b))


type FormData = {
	// Step 1: Author Information
	email: string
	password: string
	confirmPassword: string
	title: string
	firstName: string
	lastName: string
	affiliation: string
	// Step 2: Invoice Information
	address: string
	country: string
	// Step 3: Survey
	needsVisaLetter: boolean
	needsCertificate: boolean
	// Terms
	acceptTerms: boolean
}

function RegisterPage() {
	const [currentStep, setCurrentStep] = useState(1)
	const [showPassword, setShowPassword] = useState(false)
	const [showConfirmPassword, setShowConfirmPassword] = useState(false)
	const [countryOpen, setCountryOpen] = useState(false)
	const [stepValidationAttempted, setStepValidationAttempted] = useState<Record<number, boolean>>({})

	const isValidationAttempted = stepValidationAttempted[currentStep] ?? false

	const form = useForm<FormData>({
		defaultValues: {
			email: "",
			password: "",
			confirmPassword: "",
			title: "",
			firstName: "",
			lastName: "",
			affiliation: "",
			address: "",
			country: "",
			needsVisaLetter: false,
			needsCertificate: false,
			acceptTerms: false,
		},
		onSubmit: async ({ value }) => {
			console.log("Register form submitted:", value)
		},
	})

	const validateStep = async (step: number): Promise<boolean> => {
		let fieldsToValidate: (keyof FormData)[] = []

		switch (step) {
			case 1:
				fieldsToValidate = ["email", "password", "confirmPassword", "firstName", "lastName", "affiliation"]
				break
			case 2:
				fieldsToValidate = ["country"]
				break
			case 3:
				fieldsToValidate = ["acceptTerms"]
				break
		}

		for (const fieldName of fieldsToValidate) {
			await form.validateField(fieldName, "submit")
		}

		const hasErrors = fieldsToValidate.some((fieldName) => {
			const field = form.getFieldMeta(fieldName)
			return field?.errors && field.errors.length > 0
		})

		return !hasErrors
	}

	const handleNext = async () => {
		setStepValidationAttempted((prev) => ({ ...prev, [currentStep]: true }))
		const isValid = await validateStep(currentStep)
		if (isValid && currentStep < 3) {
			setCurrentStep(currentStep + 1)
		}
	}

	const handlePrev = () => {
		if (currentStep > 1) {
			setCurrentStep(currentStep - 1)
		}
	}

	const handleSubmit = async () => {
		setStepValidationAttempted((prev) => ({ ...prev, 3: true }))
		const isValid = await validateStep(3)
		if (isValid) {
			await form.handleSubmit()
		}
	}

	return (
		<Card className="mx-auto w-full max-w-xl border-border/40 bg-card/70 shadow-2xl backdrop-blur-xl">
			<CardHeader className="space-y-4">
				<div className="text-center">
					<CardTitle className="font-serif text-2xl tracking-tight sm:text-3xl">
						Registration
					</CardTitle>
				</div>

				{/* Stepper indicator */}
				<div className="relative pt-2">
					{/* Background line - thin gray connecting all steps */}
					<div className="absolute top-[calc(0.5rem+18px)] left-[calc(10%+18px)] right-[calc(10%+18px)] h-[2px] bg-border" />
					{/* Progress line - colored for completed steps */}
					<div
						className="absolute top-[calc(0.5rem+18px)] left-[calc(10%+18px)] h-[2px] bg-primary transition-all duration-500"
						style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * (80 - 3.6)}%` }}
					/>

					<div className="relative flex justify-between px-[10%]">
						{STEPS.map((step) => (
							<div key={step.id} className="flex flex-col items-center">
								<button
									type="button"
									onClick={() => {
										if (step.id < currentStep) setCurrentStep(step.id)
									}}
									disabled={step.id > currentStep}
									className={cn(
										"relative z-10 flex size-9 items-center justify-center rounded-full text-sm font-medium transition-all duration-300 border-2",
										step.id === currentStep &&
											"bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/25",
										step.id < currentStep &&
											"bg-primary text-primary-foreground border-primary cursor-pointer hover:shadow-md",
										step.id > currentStep &&
											"bg-background text-muted-foreground border-border cursor-not-allowed"
									)}
								>
									{step.id < currentStep ? (
										<IconCheck className="size-4" />
									) : (
										step.id
									)}
								</button>
								<span
									className={cn(
										"mt-2 text-xs font-medium transition-colors duration-300 max-w-20 text-center leading-tight",
										step.id === currentStep && "text-primary",
										step.id < currentStep && "text-primary/70",
										step.id > currentStep && "text-muted-foreground"
									)}
								>
									{step.title}
								</span>
							</div>
						))}
					</div>
				</div>
			</CardHeader>

			<CardContent>
				<form
					onSubmit={(e) => {
						e.preventDefault()
						e.stopPropagation()
					}}
					className="space-y-5"
				>
					{/* Step 1: Author Information */}
					{currentStep === 1 && (
						<div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
							{/* Info text */}
							<p className="text-sm leading-relaxed text-muted-foreground">
								{REGISTRATION_INFO}
							</p>

							{/* Email */}
							<form.Field
								name="email"
								validators={{
									onSubmit: ({ value }) => {
										const result = emailSchema.safeParse(value)
										return result.success ? undefined : result.error?.issues[0]?.message
									},
									onChange: ({ value }) => {
										if (!isValidationAttempted) return undefined
										const result = emailSchema.safeParse(value)
										return result.success ? undefined : result.error?.issues[0]?.message
									},
								}}
							>
								{(field) => (
									<div className="space-y-2">
										<Label htmlFor={field.name}>E-mail *</Label>
										<div className="relative">
											<IconMail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
											<Input
												id={field.name}
												type="email"
												className={cn(
													"h-10 pl-10",
													field.state.meta.errors.length > 0 && "border-destructive"
												)}
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
											/>
										</div>
										{field.state.meta.errors.length > 0 && (
											<p className="text-xs text-destructive">{field.state.meta.errors[0]}</p>
										)}
									</div>
								)}
							</form.Field>

							{/* Password fields */}
							<div className="grid gap-4 sm:grid-cols-2">
								<form.Field
									name="password"
									validators={{
										onSubmit: ({ value }) => {
											const result = passwordSchema.safeParse(value)
											return result.success ? undefined : result.error?.issues[0]?.message
										},
										onChange: ({ value }) => {
											if (!isValidationAttempted) return undefined
											const result = passwordSchema.safeParse(value)
											return result.success ? undefined : result.error?.issues[0]?.message
										},
									}}
								>
									{(field) => (
										<div className="space-y-2">
											<Label htmlFor={field.name}>Password *</Label>
											<div className="relative">
												<IconLock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
												<Input
													id={field.name}
													type={showPassword ? "text" : "password"}
													placeholder="Min. 10 characters"
													className={cn(
														"h-10 pl-10 pr-10",
														field.state.meta.errors.length > 0 && "border-destructive"
													)}
													value={field.state.value}
													onBlur={field.handleBlur}
													onChange={(e) => field.handleChange(e.target.value)}
												/>
												<button
													type="button"
													onClick={() => setShowPassword(!showPassword)}
													className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
												>
													{showPassword ? <IconEyeOff className="size-4" /> : <IconEye className="size-4" />}
												</button>
											</div>
											{field.state.meta.errors.length > 0 && (
												<p className="text-xs text-destructive">{field.state.meta.errors[0]}</p>
											)}
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
										<div className="space-y-2">
											<Label htmlFor={field.name}>Confirm Password *</Label>
											<div className="relative">
												<IconLock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
												<Input
													id={field.name}
													type={showConfirmPassword ? "text" : "password"}
													placeholder="Repeat password"
													className={cn(
														"h-10 pl-10 pr-10",
														field.state.meta.errors.length > 0 && "border-destructive"
													)}
													value={field.state.value}
													onBlur={field.handleBlur}
													onChange={(e) => field.handleChange(e.target.value)}
												/>
												<button
													type="button"
													onClick={() => setShowConfirmPassword(!showConfirmPassword)}
													className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
												>
													{showConfirmPassword ? <IconEyeOff className="size-4" /> : <IconEye className="size-4" />}
												</button>
											</div>
											{field.state.meta.errors.length > 0 && (
												<p className="text-xs text-destructive">{field.state.meta.errors[0]}</p>
											)}
										</div>
									)}
								</form.Field>
							</div>

							{/* Title + Name fields */}
							<div className="grid gap-4 sm:grid-cols-[100px_1fr_1fr]">
								<form.Field name="title">
									{(field) => (
										<div className="space-y-2">
											<Label htmlFor={field.name}>Title</Label>
											<Select
												value={field.state.value}
												onValueChange={(value) => field.handleChange(value)}
											>
												<SelectTrigger className="h-10">
													<SelectValue placeholder="Title" />
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

								<form.Field
									name="firstName"
									validators={{
										onSubmit: ({ value }) => {
											const result = requiredString("First name").safeParse(value)
											return result.success ? undefined : result.error?.issues[0]?.message
										},
										onChange: ({ value }) => {
											if (!isValidationAttempted) return undefined
											const result = requiredString("First name").safeParse(value)
											return result.success ? undefined : result.error?.issues[0]?.message
										},
									}}
								>
									{(field) => (
										<div className="space-y-2">
											<Label htmlFor={field.name}>First name *</Label>
											<Input
												id={field.name}
												type="text"
												className={cn(
													"h-10",
													field.state.meta.errors.length > 0 && "border-destructive"
												)}
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
											/>
											{field.state.meta.errors.length > 0 && (
												<p className="text-xs text-destructive">{field.state.meta.errors[0]}</p>
											)}
										</div>
									)}
								</form.Field>

								<form.Field
									name="lastName"
									validators={{
										onSubmit: ({ value }) => {
											const result = requiredString("Last name").safeParse(value)
											return result.success ? undefined : result.error?.issues[0]?.message
										},
										onChange: ({ value }) => {
											if (!isValidationAttempted) return undefined
											const result = requiredString("Last name").safeParse(value)
											return result.success ? undefined : result.error?.issues[0]?.message
										},
									}}
								>
									{(field) => (
										<div className="space-y-2">
											<Label htmlFor={field.name}>Last name *</Label>
											<Input
												id={field.name}
												type="text"
												className={cn(
													"h-10",
													field.state.meta.errors.length > 0 && "border-destructive"
												)}
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
											/>
											{field.state.meta.errors.length > 0 && (
												<p className="text-xs text-destructive">{field.state.meta.errors[0]}</p>
											)}
										</div>
									)}
								</form.Field>
							</div>

							{/* Affiliation */}
							<form.Field
								name="affiliation"
								validators={{
									onSubmit: ({ value }) => {
										const result = requiredString("Affiliation").safeParse(value)
										return result.success ? undefined : result.error?.issues[0]?.message
									},
									onChange: ({ value }) => {
										if (!isValidationAttempted) return undefined
										const result = requiredString("Affiliation").safeParse(value)
										return result.success ? undefined : result.error?.issues[0]?.message
									},
								}}
							>
								{(field) => (
									<div className="space-y-2">
										<Label htmlFor={field.name}>Affiliation *</Label>
										<div className="relative">
											<IconBuilding className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
											<Input
												id={field.name}
												type="text"
												className={cn(
													"h-10 pl-10",
													field.state.meta.errors.length > 0 && "border-destructive"
												)}
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
											/>
										</div>
										<p className="text-xs text-muted-foreground">
											The name of your institute, university or company.
										</p>
										{field.state.meta.errors.length > 0 && (
											<p className="text-xs text-destructive">{field.state.meta.errors[0]}</p>
										)}
									</div>
								)}
							</form.Field>
						</div>
					)}

					{/* Step 2: Invoice Information */}
					{currentStep === 2 && (
						<div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
							<p className="text-sm text-muted-foreground">
								Please provide your billing address for invoice purposes.
							</p>

							{/* Address */}
							<form.Field name="address">
								{(field) => (
									<div className="space-y-2">
										<Label htmlFor={field.name}>Address</Label>
										<div className="relative">
											<IconMapPin className="absolute left-3 top-3 size-4 text-muted-foreground" />
											<textarea
												id={field.name}
												rows={4}
												className={cn(
													"flex w-full rounded-lg border border-input bg-transparent px-3 py-2 pl-10 text-sm transition-colors",
													"placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring",
													"disabled:cursor-not-allowed disabled:opacity-50 resize-none"
												)}
												value={field.state.value}
												onChange={(e) => field.handleChange(e.target.value)}
											/>
										</div>
									</div>
								)}
							</form.Field>

							{/* Country */}
							<form.Field
								name="country"
								validators={{
									onSubmit: ({ value }) => {
										const result = requiredString("Country").safeParse(value)
										return result.success ? undefined : result.error?.issues[0]?.message
									},
									onChange: ({ value }) => {
										if (!isValidationAttempted) return undefined
										const result = requiredString("Country").safeParse(value)
										return result.success ? undefined : result.error?.issues[0]?.message
									},
								}}
							>
								{(field) => (
									<div className="space-y-2">
										<Label>Country *</Label>
										<Popover open={countryOpen} onOpenChange={setCountryOpen}>
											<PopoverTrigger asChild>
												<Button
													variant="outline"
													role="combobox"
													aria-expanded={countryOpen}
													className={cn(
														"h-10 w-full justify-between pl-3 font-normal",
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
											<PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
												<Command>
													<CommandInput placeholder="Search country..." />
													<CommandList>
														<CommandEmpty>No country found.</CommandEmpty>
														<CommandGroup>
															{COUNTRIES.map((country) => (
																<CommandItem
																	key={country}
																	value={country}
																	data-checked={field.state.value === country}
																	onSelect={() => {
																		field.handleChange(country)
																		setCountryOpen(false)
																	}}
																>
																	{country}
																</CommandItem>
															))}
														</CommandGroup>
													</CommandList>
												</Command>
											</PopoverContent>
										</Popover>
										{field.state.meta.errors.length > 0 && (
											<p className="text-xs text-destructive">{field.state.meta.errors[0]}</p>
										)}
									</div>
								)}
							</form.Field>
						</div>
					)}

					{/* Step 3: Survey */}
					{currentStep === 3 && (
						<div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
							<p className="text-sm text-muted-foreground">
								Please let us know if you need any additional documents.
							</p>

							{/* Survey checkboxes */}
							<div className="space-y-4 rounded-lg border border-border/50 bg-muted/20 p-4">
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
									<div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-4">
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
												I agree to the{" "}
												<span className="text-primary hover:underline">Terms of Service</span> and{" "}
												<span className="text-primary hover:underline">Privacy Policy</span> *
											</Label>
										</div>
										{field.state.meta.errors.length > 0 && (
											<p className="text-xs text-destructive">{field.state.meta.errors[0]}</p>
										)}
									</div>
								)}
							</form.Field>
						</div>
					)}

					{/* Navigation buttons */}
					<div className="flex gap-3 pt-2">
						{currentStep > 1 && (
							<Button
								type="button"
								variant="outline"
								onClick={handlePrev}
								className="h-10 flex-1"
							>
								<IconArrowLeft className="mr-2 size-4" />
								Back
							</Button>
						)}

						{currentStep < 3 ? (
							<Button
								type="button"
								onClick={handleNext}
								className="h-10 flex-1 transition-all duration-200 hover:scale-[1.02]"
							>
								Continue
								<IconArrowRight className="ml-2 size-4" />
							</Button>
						) : (
							<Button
								type="button"
								onClick={handleSubmit}
								disabled={form.state.isSubmitting}
								className="h-10 flex-1 transition-all duration-200 hover:scale-[1.02]"
							>
								{form.state.isSubmitting ? "Creating account..." : "Create account"}
							</Button>
						)}
					</div>
				</form>

				{/* Login link */}
				<p className="mt-6 text-center text-sm text-muted-foreground">
					Already have an account?{" "}
					<Link
						to="/login"
						className="font-medium text-primary transition-colors hover:text-primary/80 hover:underline"
					>
						Sign in
					</Link>
				</p>
			</CardContent>
		</Card>
	)
}
