import type { Icon } from "@tabler/icons-react";
import type { ReactNode } from "react";

interface SettingsSectionProps {
	icon: Icon;
	title: string;
	description: string;
	children: ReactNode;
	delay?: number;
}

export function SettingsSection({
	icon: IconComponent,
	title,
	description,
	children,
	delay = 0,
}: SettingsSectionProps) {
	return (
		<section className="group" style={{ animationDelay: `${delay}ms` }}>
			<div className="border-border/50 bg-card focus-within:outline-ring before:via-primary relative overflow-hidden rounded-2xl border shadow-sm backdrop-blur-[8px] transition-shadow duration-300 before:absolute before:top-0 before:right-0 before:left-0 before:h-px before:bg-linear-to-r before:from-transparent before:to-transparent before:opacity-0 before:transition-opacity before:duration-400 focus-within:outline-2 focus-within:outline-offset-2 hover:shadow-lg hover:before:opacity-30">
				<div className="absolute top-0 right-0 h-24 w-24 opacity-5">
					<svg
						aria-hidden="true"
						className="text-primary"
						viewBox="0 0 100 100"
					>
						<path
							className="transition-opacity duration-500 group-hover:opacity-100"
							d="M0,0 L100,0 L100,100 Z"
							fill="currentColor"
						/>
					</svg>
				</div>

				<div className="border-border/30 bg-muted/20 relative border-b px-6 py-5 sm:px-8 sm:py-6">
					<div className="flex items-start gap-4">
						<div className="bg-primary/10 flex size-12 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110">
							<IconComponent className="text-primary size-6 transition-transform duration-300 group-hover:rotate-12" />
						</div>
						<div className="flex-1">
							<h2 className="text-foreground mb-1 text-xl font-bold tracking-tight">
								{title}
							</h2>
							<p className="text-muted-foreground text-sm">{description}</p>
						</div>
					</div>
				</div>

				<div className="p-6 sm:p-8">{children}</div>
			</div>
		</section>
	);
}
