import type { ComponentProps } from "react";

interface FormProps extends Omit<ComponentProps<"form">, "onSubmit"> {
	onSubmit: () => void;
}

/** `noValidate`: native constraints (email/min/max/step) block submission before
 *  handleSubmit runs, so the form's own zod errors never render. */
export function Form({ onSubmit, children, ...props }: FormProps) {
	return (
		<form
			noValidate
			{...props}
			onSubmit={(e) => {
				e.preventDefault();
				e.stopPropagation();
				onSubmit();
			}}
		>
			{children}
		</form>
	);
}
