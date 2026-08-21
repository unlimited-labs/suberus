import type { ComponentType, ReactNode } from "react";
import { Separator } from "@/shared/ui/separator";

interface PageHeaderProps {
	icon?: ComponentType<{ className?: string }>;
	title: string;
	children?: ReactNode;
}

export function PageHeader({ icon: Icon, title, children }: PageHeaderProps) {
	return (
		<div className="flex h-14 items-center justify-between border-b border-border px-6">
			<div className="flex items-center gap-3">
				{Icon && (
					<>
						<Icon className="size-5 text-muted-foreground" />
						<Separator className="h-5" orientation="vertical" />
					</>
				)}
				<h1 className="text-lg font-medium text-foreground">{title}</h1>
			</div>
			{children && <div className="flex items-center gap-2">{children}</div>}
		</div>
	);
}
