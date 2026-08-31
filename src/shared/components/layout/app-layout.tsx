import type { ReactNode } from "react";
import { EmailVerificationBanner } from "@/shared/components/email-verification-banner";
import { MobileSidebar, Sidebar } from "./sidebar";

interface AppLayoutProps {
	children: ReactNode;
	conferenceName: string;
	logoUrl: string;
	footerText: string;
	logoDarkInvert: boolean;
	scheduleStatus?: string;
	exhibitorsEnabled: boolean;
	feeEnabled: boolean;
	financesEnabled: boolean;
	hasDocuments: boolean;
}

export function AppLayout({
	children,
	conferenceName,
	logoUrl,
	footerText,
	logoDarkInvert,
	scheduleStatus,
	exhibitorsEnabled,
	feeEnabled,
	financesEnabled,
	hasDocuments,
}: AppLayoutProps) {
	return (
		<div className="bg-sidebar flex h-screen">
			<Sidebar
				conferenceName={conferenceName}
				exhibitorsEnabled={exhibitorsEnabled}
				feeEnabled={feeEnabled}
				financesEnabled={financesEnabled}
				hasDocuments={hasDocuments}
				logoDarkInvert={logoDarkInvert}
				logoUrl={logoUrl}
				scheduleStatus={scheduleStatus}
			/>
			<div className="flex flex-1 flex-col overflow-hidden">
				<div className="flex h-14 items-center px-3 md:hidden">
					<MobileSidebar
						conferenceName={conferenceName}
						exhibitorsEnabled={exhibitorsEnabled}
						feeEnabled={feeEnabled}
						financesEnabled={financesEnabled}
						hasDocuments={hasDocuments}
						logoDarkInvert={logoDarkInvert}
						logoUrl={logoUrl}
						scheduleStatus={scheduleStatus}
					/>
				</div>
				<main className="bg-background flex flex-1 flex-col overflow-auto shadow-lg md:m-2 md:rounded-2xl">
					<EmailVerificationBanner />
					<div className="flex min-h-0 flex-1 flex-col overflow-auto">
						{children}
					</div>
					{footerText && (
						<footer className="text-muted-foreground border-t px-4 py-3 text-center text-xs">
							{footerText}
						</footer>
					)}
				</main>
			</div>
		</div>
	);
}
