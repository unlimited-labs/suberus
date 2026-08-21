import type { ComponentType, ReactNode } from "react";
import { Separator } from "@/shared/ui/separator";

interface PageHeaderProps {
	icon?: ComponentType<{ className?: string }>;
	title: string;
	children?: ReactNode;
}

export function PageHeader({ icon: Icon, title, children }: PageHeaderProps) {
	return (
		<div className="border-border flex h-14 items-center justify-between border-b px-6">
			<div className="flex items-center gap-3">
				{Icon && (
					<>
						<Icon className="text-muted-foreground size-5" />
						<Separator className="h-5" orientation="vertical" />
					</>
				)}
				<h1 className="text-foreground text-lg font-medium">{title}</h1>
			</div>
			{children && <div className="flex items-center gap-2">{children}</div>}
		</div>
	);
}
