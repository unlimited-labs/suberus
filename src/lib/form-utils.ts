import type { AnyFieldMetaBase, Updater } from "@tanstack/react-form";

/**
 * Mark all registered fields as blurred so validation errors become visible,
 * then trigger form submission. Use this instead of `form.handleSubmit()`
 * to ensure errors display after a submit attempt even for fields the user
 * hasn't visited yet.
 */
export function submitForm(form: {
	state: { fieldMeta: object };
	setFieldMeta: (field: never, updater: Updater<AnyFieldMetaBase>) => void;
	handleSubmit: () => void;
}) {
	for (const fieldName of Object.keys(form.state.fieldMeta)) {
		form.setFieldMeta(fieldName as never, (prev) => ({
			...prev,
			isBlurred: true,
		}));
	}
	form.handleSubmit();
}
