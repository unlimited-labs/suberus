import { useStore } from "@tanstack/react-form";

import { useFieldContext } from "@/hooks/form-context";

/**
 * Shared field-error state for composable form fields: resolves the current
 * field's validation errors and whether they should be shown (after blur or a
 * submit attempt).
 */
export function useFieldError<T = string>() {
	const field = useFieldContext<T>();
	const errors = useStore(field.store, (s) => s.meta.errors);
	const submissionAttempts = useStore(
		field.form.store,
		(s) => s.submissionAttempts,
	);
	const hasError =
		(field.state.meta.isBlurred || submissionAttempts > 0) && errors.length > 0;

	return { field, errors, hasError };
}
