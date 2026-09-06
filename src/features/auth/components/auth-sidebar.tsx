import { cn } from "@/shared/lib/utils";
import { type Step, StepIndicator } from "@/shared/ui/step-indicator";

interface AuthSidebarProps {
	steps?: readonly Step[];
	currentStep?: number;
	width?: "narrow" | "wide";
	conferenceName: string;
	conferenceDate: string;
	conferenceLocation: string;
	conferenceSubtitle?: string;
}

export function AuthSidebar({
	steps,
	currentStep = 1,
	width = "narrow",
	conferenceName,
	conferenceDate,
	conferenceLocation,
	conferenceSubtitle,
}: AuthSidebarProps) {
	return (
		<div
			className={cn(
				"relative hidden shrink-0 flex-col justify-between overflow-hidden bg-primary p-6 text-primary-foreground lg:flex",
				width === "narrow" ? "w-64" : "w-72",
			)}
		>
			<div
				className="absolute inset-0 bg-cover bg-center opacity-40"
				style={{
					backgroundImage: "url('auth_bg.jpg')",
				}}
			/>
			<div className="from-primary/90 via-primary/70 to-primary/90 absolute inset-0 bg-linear-to-br" />

			<div className="relative z-10 space-y-3">
				<h2 className="text-2xl font-bold tracking-tight">{conferenceName}</h2>
				{(conferenceDate || conferenceLocation) && (
					<div className="text-primary-foreground/80 space-y-1 text-sm">
						{conferenceDate && <p>{conferenceDate}</p>}
						{conferenceLocation && <p>{conferenceLocation}</p>}
					</div>
				)}
			</div>

			{steps && steps.length > 0 ? (
				<StepIndicator
					className="relative z-10"
					currentStep={currentStep}
					steps={steps}
					tone="onPrimary"
				/>
			) : (
				conferenceSubtitle && (
					<p className="text-primary-foreground/90 relative z-10 text-sm font-medium wrap-break-word">
						{conferenceSubtitle}
					</p>
				)
			)}
		</div>
	);
}
