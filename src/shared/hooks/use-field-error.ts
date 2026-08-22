import { useSelector } from "@tanstack/react-store";
import { useFieldContext } from "@/shared/hooks/form-context";

/** For raw `form.Field` render-props, which lack the field context useFieldError needs. */
export function isFieldErrorVisible(
	meta: { isBlurred: boolean; errors: readonly unknown[] },
	/** Omit where blur is marked by hand, e.g. the register wizard's step gate. */
	submissionAttempts = 0,
): boolean {
	return (meta.isBlurred || submissionAttempts > 0) && meta.errors.length > 0;
}

export function useFieldError<T = string>() {
	const field = useFieldContext<T>();
	const errors = useSelector(field.store, (s) => s.meta.errors);
	const submissionAttempts = useSelector(
		field.form.store,
		(s) => s.submissionAttempts,
	);
	const hasError = isFieldErrorVisible(
		{ isBlurred: field.state.meta.isBlurred, errors },
		submissionAttempts,
	);

	return { field, errors, hasError };
}
