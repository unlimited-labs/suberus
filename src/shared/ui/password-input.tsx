import { IconLock } from "@tabler/icons-react";
import type * as React from "react";
import { usePasswordVisibility } from "@/shared/hooks/use-password-visibility";
import { cn } from "@/shared/lib/utils";
import { Input } from "@/shared/ui/input";

type PasswordInputProps = Omit<
	React.ComponentProps<"input">,
	"type" | "value" | "onChange"
> & {
	value: string;
	onChange: (value: string) => void;
};

export function PasswordInput({
	className,
	onChange,
	...props
}: PasswordInputProps) {
	const { visible, type, toggle, Icon } = usePasswordVisibility();

	return (
		<div className="relative">
			<IconLock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
			<Input
				{...props}
				type={type}
				className={cn("h-9 pl-9 pr-10", className)}
				onChange={(e) => onChange(e.target.value)}
			/>
			<button
				type="button"
				onClick={toggle}
				aria-label={visible ? "Hide password" : "Show password"}
				className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
			>
				<Icon className="size-4" />
			</button>
		</div>
	);
}
