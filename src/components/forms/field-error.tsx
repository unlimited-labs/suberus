interface FieldErrorProps {
	errors: (string | undefined)[];
}

export function FieldError({ errors }: FieldErrorProps) {
	const firstError = errors.find(Boolean);
	if (!firstError) return null;

	return <p className="text-xs text-destructive">{firstError}</p>;
}
