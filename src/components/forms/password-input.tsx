import { IconLock } from "@tabler/icons-react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { usePasswordVisibility } from "@/hooks/use-password-visibility"

interface PasswordInputProps {
	id?: string
	value: string
	onChange: (value: string) => void
	onBlur?: () => void
	placeholder?: string
	hasError?: boolean
	className?: string
}

export function PasswordInput({
	id,
	value,
	onChange,
	onBlur,
	placeholder,
	hasError,
	className,
}: PasswordInputProps) {
	const { type, toggle, Icon } = usePasswordVisibility()

	return (
		<div className="relative">
			<IconLock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
			<Input
				id={id}
				type={type}
				placeholder={placeholder}
				className={cn("h-9 pl-9 pr-10", hasError && "border-destructive", className)}
				value={value}
				onBlur={onBlur}
				onChange={(e) => onChange(e.target.value)}
			/>
			<button
				type="button"
				onClick={toggle}
				className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
			>
				<Icon className="size-4" />
			</button>
		</div>
	)
}
