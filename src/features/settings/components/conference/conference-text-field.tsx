import type { ReactNode } from "react";
import { isFieldErrorVisible } from "@/shared/hooks/use-field-error";
import { FieldError } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import type { ConferenceFormApi } from "./use-conference-settings";

type TextFieldName =
	| "name"
	| "subtitle"
	| "location"
	| "website"
	| "contactEmail"
	| "conferenceStartDate"
	| "conferenceEndDate"
	| "submissionDeadline"
	| "registrationDeadline"
	| "reviewDeadline"
	| "notificationDate";

interface ConferenceTextFieldProps {
	form: ConferenceFormApi;
	submissionAttempts: number;
	name: TextFieldName;
	label: string;
	type?: string;
	placeholder?: string;
	className?: string;
	/** Wraps the input, e.g. to position a leading icon. */
	adornment?: ReactNode;
	description?: ReactNode;
	containerClassName?: string;
}

export function ConferenceTextField({
	form,
	submissionAttempts,
	name,
	label,
	type,
	placeholder,
	className,
	adornment,
	description,
	containerClassName = "space-y-2",
}: ConferenceTextFieldProps) {
	return (
		<form.Field name={name}>
			{(field) => {
				const hasError = isFieldErrorVisible(
					field.state.meta,
					submissionAttempts,
				);
				const input = (
					<Input
						aria-invalid={hasError}
						className={className}
						id={name}
						onBlur={field.handleBlur}
						onChange={(e) => field.handleChange(e.target.value)}
						placeholder={placeholder}
						type={type}
						value={field.state.value}
					/>
				);
				return (
					<div className={containerClassName}>
						<Label htmlFor={name}>{label}</Label>
						{adornment ? (
							<div className="relative">
								{adornment}
								{input}
							</div>
						) : (
							input
						)}
						{description}
						<FieldError
							errors={hasError ? field.state.meta.errors : undefined}
						/>
					</div>
				);
			}}
		</form.Field>
	);
}
