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

export function describedByIds(name: string) {
	return { error: `${name}-error`, description: `${name}-description` };
}

/** Controls render the error/description ids that FormField puts on those nodes. */
export function fieldAria(
	name: string,
	hasError: boolean,
	hasDescription: boolean,
) {
	const ids = describedByIds(name);
	const described = [
		hasError ? ids.error : null,
		hasDescription ? ids.description : null,
	].filter(Boolean);
	return {
		"aria-invalid": hasError,
		"aria-describedby": described.length > 0 ? described.join(" ") : undefined,
	};
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
