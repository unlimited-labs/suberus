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
		<section
			className="group animate-fade-in-up animate-duration-700"
			style={{ animationDelay: `${delay}ms` }}
		>
			<div className="settings-card relative overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm backdrop-blur-[8px] transition-shadow duration-300 hover:shadow-lg focus-within:outline-2 focus-within:outline-ring focus-within:outline-offset-2 before:absolute before:left-0 before:right-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-primary before:to-transparent before:opacity-0 before:transition-opacity before:duration-400 hover:before:opacity-30">
				<div className="absolute right-0 top-0 h-24 w-24 opacity-5">
					<svg
						viewBox="0 0 100 100"
						className="text-primary"
						aria-hidden="true"
					>
						<path
							d="M0,0 L100,0 L100,100 Z"
							fill="currentColor"
							className="transition-opacity duration-500 group-hover:opacity-100"
						/>
					</svg>
				</div>

				<div className="relative border-b border-border/30 bg-muted/20 px-6 py-5 sm:px-8 sm:py-6">
					<div className="flex items-start gap-4">
						<div className="settings-icon-wrapper flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 transition-transform duration-300 group-hover:scale-110">
							<IconComponent className="size-6 text-primary transition-transform duration-300 group-hover:rotate-12" />
						</div>
						<div className="flex-1">
							<h2 className="mb-1 text-xl font-bold tracking-tight text-foreground">
								{title}
							</h2>
							<p className="text-sm text-muted-foreground">{description}</p>
						</div>
					</div>
				</div>

				<div className="p-6 sm:p-8">{children}</div>
			</div>
		</section>
	);
}
