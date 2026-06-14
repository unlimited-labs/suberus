import { getRouteApi } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { AuthSidebar } from "@/components/forms/auth-sidebar";
import { cn } from "@/shared/lib/utils";

interface Step {
	id: number;
	title: string;
}

interface AuthCardProps {
	title?: string;
	subtitle?: string;
	/** Center content vertically (for success/error states) */
	centered?: boolean;
	/** Use wider max-width (max-w-4xl instead of max-w-3xl) */
	wide?: boolean;
	steps?: readonly Step[];
	currentStep?: number;
	/** Extra content in the mobile header (below conferenceName) */
	mobileHeaderExtra?: ReactNode;
	children: ReactNode;
}

const authRoute = getRouteApi("/_auth");

export function AuthCard({
	title,
	subtitle,
	centered,
	wide,
	steps,
	currentStep,
	mobileHeaderExtra,
	children,
}: AuthCardProps) {
	const {
		conferenceName,
		conferenceDate,
		conferenceLocation,
		conferenceSubtitle,
	} = authRoute.useRouteContext();

	return (
		<div
			className={cn(
				"mx-auto flex w-full overflow-hidden rounded-2xl bg-card shadow-2xl",
				wide ? "max-w-4xl" : "max-w-3xl",
			)}
		>
			<AuthSidebar
				conferenceName={conferenceName}
				conferenceDate={conferenceDate}
				conferenceLocation={conferenceLocation}
				conferenceSubtitle={conferenceSubtitle}
				steps={steps}
				currentStep={currentStep}
				width={wide ? "wide" : "narrow"}
			/>
			<div
				className={cn(
					"flex flex-1 flex-col bg-card p-5 text-foreground sm:p-6 lg:p-8",
					centered && "items-center justify-center",
				)}
			>
				{/* Mobile header */}
				<div className="mb-4 lg:hidden">
					<h1 className="text-lg font-bold">{conferenceName}</h1>
					{mobileHeaderExtra}
				</div>

				{/* Desktop header */}
				{title && (
					<div className="mb-4 hidden lg:block">
						<h1 className="text-xl font-semibold tracking-tight">{title}</h1>
						{subtitle && (
							<p className="text-sm text-muted-foreground">{subtitle}</p>
						)}
					</div>
				)}

				{children}
			</div>
		</div>
	);
}
