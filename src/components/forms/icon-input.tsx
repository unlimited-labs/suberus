import type * as React from "react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface IconInputProps extends React.ComponentProps<typeof Input> {
	icon: React.ReactNode
	hasError?: boolean
}

export function IconInput({ icon, hasError, className, ...props }: IconInputProps) {
	return (
		<div className="relative">
			<div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
				{icon}
			</div>
			<Input
				className={cn("h-9 pl-9", hasError && "border-destructive", className)}
				{...props}
			/>
		</div>
	)
}
