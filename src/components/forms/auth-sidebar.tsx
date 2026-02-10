import { IconCheck } from "@tabler/icons-react";

import { cn } from "@/lib/utils";

interface Step {
	id: number;
	title: string;
}

interface AuthSidebarProps {
	steps?: Step[];
	currentStep?: number;
	width?: "narrow" | "wide";
	conferenceName: string;
	conferenceDate: string;
	conferenceLocation: string;
}

export function AuthSidebar({
	steps,
	currentStep = 1,
	width = "narrow",
	conferenceName,
	conferenceDate,
	conferenceLocation,
}: AuthSidebarProps) {
	return (
		<div
			className={cn(
				"relative hidden shrink-0 flex-col justify-between overflow-hidden bg-primary p-6 text-primary-foreground lg:flex",
				width === "narrow" ? "w-64" : "w-72",
			)}
		>
			{/* Background image with overlay */}
			<div
				className="absolute inset-0 bg-cover bg-center opacity-40"
				style={{
					backgroundImage:
						"url('https://images.unsplash.com/photo-1639322537228-f710d846310a?auto=format&fit=crop&w=1920&q=80')",
				}}
			/>
			<div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary/70 to-primary/90" />

			{/* Conference info */}
			<div className="relative z-10 space-y-3">
				<h2 className="text-2xl font-bold tracking-tight">{conferenceName}</h2>
				{(conferenceDate || conferenceLocation) && (
					<div className="space-y-1 text-sm text-primary-foreground/80">
						{conferenceDate && <p>{conferenceDate}</p>}
						{conferenceLocation && <p>{conferenceLocation}</p>}
					</div>
				)}
			</div>

			{/* Step indicators (optional) */}
			{steps && steps.length > 0 ? (
				<div className="relative z-10 space-y-2">
					{steps.map((step) => (
						<div
							key={step.id}
							className={cn(
								"flex items-center gap-2 transition-opacity duration-300",
								step.id === currentStep ? "opacity-100" : "opacity-50",
							)}
						>
							<div
								className={cn(
									"flex size-6 items-center justify-center rounded-full border-2 text-xs font-medium transition-all",
									step.id < currentStep &&
										"border-primary-foreground bg-primary-foreground text-primary",
									step.id === currentStep &&
										"border-primary-foreground bg-transparent",
									step.id > currentStep &&
										"border-primary-foreground/50 bg-transparent",
								)}
							>
								{step.id < currentStep ? (
									<IconCheck className="size-3" />
								) : (
									step.id
								)}
							</div>
							<span className="text-xs font-medium">{step.title}</span>
						</div>
					))}
				</div>
			) : (
				<p className="relative z-10 text-xs text-primary-foreground/60">
					{conferenceName}
				</p>
			)}
		</div>
	);
}
