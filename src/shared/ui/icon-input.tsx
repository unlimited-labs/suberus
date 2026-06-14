import type * as React from "react";
import { cn } from "@/shared/lib/utils";
import { Input } from "@/shared/ui/input";

interface IconInputProps extends React.ComponentProps<typeof Input> {
	icon: React.ReactNode;
}

export function IconInput({ icon, className, ...props }: IconInputProps) {
	return (
		<div className="relative">
			<div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
				{icon}
			</div>
			<Input className={cn("h-9 pl-9", className)} {...props} />
		</div>
	);
}
