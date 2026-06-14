import { Button } from "@/components/ui/button";
import { useFormContext } from "@/shared/hooks/form-context";

interface FormSubmitButtonProps {
	label: string;
	/** Label while submitting; defaults to `label` (button text unchanged). */
	submittingLabel?: string;
	/** Extra disabled condition, OR-ed with `isSubmitting`. */
	disabled?: boolean;
	className?: string;
	testId?: string;
}

/**
 * Submit button bound to the form via context. Subscribes to `isSubmitting`
 * through `form.Subscribe` so the disabled state actually engages during async
 * submit (reading `form.state.isSubmitting` directly in render is non-reactive
 * and never re-renders, which allowed double-submits).
 *
 * The button is intentionally NOT disabled while the form is merely invalid:
 * clicking submit on an invalid form runs the validators and reveals the field
 * errors (the validators block the real submit anyway). Disabling on
 * `!canSubmit` breaks that click-to-validate flow — and Playwright treats both
 * `disabled` and `aria-disabled` as un-clickable, so it also breaks the suite.
 */
export function FormSubmitButton({
	label,
	submittingLabel,
	disabled,
	className,
	testId,
}: FormSubmitButtonProps) {
	const form = useFormContext();
	return (
		<form.Subscribe selector={(s) => s.isSubmitting}>
			{(isSubmitting) => (
				<Button
					type="submit"
					className={className}
					disabled={isSubmitting || disabled}
					data-testid={testId}
				>
					{isSubmitting ? (submittingLabel ?? label) : label}
				</Button>
			)}
		</form.Subscribe>
	);
}
