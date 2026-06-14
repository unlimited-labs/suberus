import { IconLock } from "@tabler/icons-react";
import { usePasswordVisibility } from "@/hooks/use-password-visibility";
import { cn } from "@/shared/lib/utils";
import { Input } from "@/shared/ui/input";

interface PasswordInputProps {
	id?: string;
	value: string;
	onChange: (value: string) => void;
	onBlur?: () => void;
	placeholder?: string;
	className?: string;
	disabled?: boolean;
	"aria-invalid"?: boolean;
}

export function PasswordInput({
	id,
	value,
	onChange,
	onBlur,
	placeholder,
	className,
	disabled,
	"aria-invalid": ariaInvalid,
}: PasswordInputProps) {
	const { type, toggle, Icon } = usePasswordVisibility();

	return (
		<div className="relative">
			<IconLock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
			<Input
				id={id}
				type={type}
				placeholder={placeholder}
				className={cn("h-9 pl-9 pr-10", className)}
				aria-invalid={ariaInvalid}
				value={value}
				onBlur={onBlur}
				onChange={(e) => onChange(e.target.value)}
				disabled={disabled}
			/>
			<button
				type="button"
				onClick={toggle}
				className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
			>
				<Icon className="size-4" />
			</button>
		</div>
	);
}
