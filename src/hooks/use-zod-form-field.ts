import type { z } from "zod"

type ValidatorFn = (params: { value: unknown }) => string | undefined

interface ZodFormFieldValidators {
	onBlur: ValidatorFn
	onSubmit: ValidatorFn
}

export function useZodFormField<T>(schema: z.ZodSchema<T>): ZodFormFieldValidators {
	const validate: ValidatorFn = ({ value }) => {
		const result = schema.safeParse(value)
		return result.success ? undefined : result.error.issues[0]?.message
	}

	return {
		onBlur: validate,
		onSubmit: validate,
	}
}

interface OnChangeValidators {
	onChange: ValidatorFn
	onSubmit: ValidatorFn
}

export function useZodFormFieldOnChange<T>(
	schema: z.ZodSchema<T>,
	isValidationAttempted: boolean
): OnChangeValidators {
	return {
		onSubmit: ({ value }) => {
			const result = schema.safeParse(value)
			return result.success ? undefined : result.error.issues[0]?.message
		},
		onChange: ({ value }) => {
			if (!isValidationAttempted) return undefined
			const result = schema.safeParse(value)
			return result.success ? undefined : result.error.issues[0]?.message
		},
	}
}
