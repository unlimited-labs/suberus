import {
	IconAlertCircle,
	IconCheck,
	IconMail,
	IconMailCheck,
	IconMailX,
	IconMapPin,
	IconRefresh,
	IconSelector,
	IconWorld,
} from "@tabler/icons-react";
import { useForm } from "@tanstack/react-form";
import { countries } from "countries-list";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { FieldError } from "@/components/forms/field-error";
import { IconInput } from "@/components/forms/icon-input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
import { useZodFormFieldOnChange } from "@/hooks/use-zod-form-field";
import { sendVerificationEmail } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import type { ContactInfoFormData } from "@/lib/validations/profile";

const COUNTRIES = Object.values(countries)
	.map((c) => c.name)
	.toSorted((a, b) => a.localeCompare(b));

interface ContactInfoSectionProps {
	initialData: ContactInfoFormData;
	onSave: (data: ContactInfoFormData) => Promise<void>;
	isLoading?: boolean;
	currentEmail: string;
	emailVerified: boolean;
}

const emailSchema = z.email("Invalid email address");

const RESEND_COOLDOWN = 60;

export function ContactInfoSection({
	initialData,
	onSave,
	isLoading,
	currentEmail,
	emailVerified,
}: ContactInfoSectionProps) {
	const [isValidationAttempted, setIsValidationAttempted] = useState(false);
	const [countryOpen, setCountryOpen] = useState(false);
	const [cooldown, setCooldown] = useState(0);
	const [isResending, setIsResending] = useState(false);

	useEffect(() => {
		if (cooldown <= 0) return;

		const timer = setInterval(() => {
			setCooldown((prev) => prev - 1);
		}, 1000);

		return () => clearInterval(timer);
	}, [cooldown]);

	const handleResend = async () => {
		if (cooldown > 0 || isResending) return;

		setIsResending(true);
		try {
			const result = await sendVerificationEmail({ email: currentEmail });
			if (result.error) {
				toast.error(result.error.message ?? "Failed to send email");
			} else {
				toast.success("Verification email sent");
				setCooldown(RESEND_COOLDOWN);
			}
		} catch {
			toast.error("Failed to send email");
		} finally {
			setIsResending(false);
		}
	};

	const form = useForm({
		defaultValues: initialData,
		onSubmit: async ({ value }) => {
			await onSave(value);
		},
	});

	const emailValidators = useZodFormFieldOnChange(
		emailSchema,
		isValidationAttempted,
	);
	const addressValidators = useZodFormFieldOnChange(
		z.string().max(500, "Address must be at most 500 characters").optional(),
		isValidationAttempted,
	);

	const handleSubmit = async () => {
		setIsValidationAttempted(true);
		await form.handleSubmit();
	};

	const emailChanged = form.state.values.email !== currentEmail;

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				e.stopPropagation();
			}}
			className="space-y-4"
		>
			{/* Email */}
			<form.Field name="email" validators={emailValidators}>
				{(field) => (
					<div className="space-y-1">
						<Label htmlFor={field.name}>Email *</Label>
						<IconInput
							id={field.name}
							type="email"
							icon={<IconMail className="size-4" />}
							hasError={field.state.meta.errors.length > 0}
							value={field.state.value}
							onBlur={field.handleBlur}
							onChange={(e) => field.handleChange(e.target.value)}
							disabled={isLoading}
						/>
						<FieldError errors={field.state.meta.errors} />
						{/* Email verification status */}
						{!emailChanged && (
							<div className="flex items-center gap-2 pt-1">
								{emailVerified ? (
									<>
										<IconMailCheck className="size-4 text-green-600" />
										<span className="text-sm text-green-600">
											Email verified
										</span>
									</>
								) : (
									<>
										<IconMailX className="size-4 text-yellow-600" />
										<span className="text-sm text-yellow-600">
											Email not verified
										</span>
										<button
											type="button"
											onClick={handleResend}
											disabled={cooldown > 0 || isResending}
											className="ml-2 inline-flex items-center gap-1 text-sm font-medium text-primary underline underline-offset-2 hover:no-underline disabled:opacity-50"
										>
											<IconRefresh
												className={`size-3 ${isResending ? "animate-spin" : ""}`}
											/>
											{cooldown > 0
												? `Resend in ${cooldown}s`
												: isResending
													? "Sending..."
													: "Resend"}
										</button>
									</>
								)}
							</div>
						)}
					</div>
				)}
			</form.Field>

			{/* Email change warning */}
			{emailChanged && (
				<Alert>
					<IconAlertCircle className="size-4" />
					<AlertDescription>
						Changing your email requires verification. You will receive a
						verification link at the new email address. Your current email will
						remain active until you verify the new one.
					</AlertDescription>
				</Alert>
			)}

			{/* Invoice Address */}
			<form.Field name="address" validators={addressValidators}>
				{(field) => (
					<div className="space-y-1">
						<Label htmlFor={field.name}>Invoice address</Label>
						<div className="relative">
							<IconMapPin className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
							<textarea
								id={field.name}
								rows={2}
								className={cn(
									"flex w-full resize-none rounded-lg border border-input bg-transparent px-3 py-2 pl-9 text-sm text-foreground transition-colors",
									"placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
									"disabled:cursor-not-allowed disabled:opacity-50",
									field.state.meta.errors.length > 0 && "border-destructive",
								)}
								value={field.state.value || ""}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
								disabled={isLoading}
							/>
						</div>
						<FieldError errors={field.state.meta.errors} />
					</div>
				)}
			</form.Field>

			{/* Country */}
			<form.Field name="country">
				{(field) => (
					<div className="space-y-1">
						<Label>Country</Label>
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
									disabled={isLoading}
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
					</div>
				)}
			</form.Field>

			{/* Save button */}
			<div className="flex justify-end pt-2">
				<Button
					type="button"
					onClick={handleSubmit}
					disabled={form.state.isSubmitting || isLoading}
					className="h-9"
				>
					{form.state.isSubmitting ? "Saving..." : "Save changes"}
				</Button>
			</div>
		</form>
	);
}
