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
		<div className="flex h-screen bg-sidebar">
			<Sidebar
				conferenceName={conferenceName}
				logoUrl={logoUrl}
				logoDarkInvert={logoDarkInvert}
				scheduleStatus={scheduleStatus}
				exhibitorsEnabled={exhibitorsEnabled}
				feeEnabled={feeEnabled}
				financesEnabled={financesEnabled}
				hasDocuments={hasDocuments}
			/>
			<div className="flex flex-1 flex-col overflow-hidden">
				<div className="flex h-14 items-center px-3 md:hidden">
					<MobileSidebar
						conferenceName={conferenceName}
						logoUrl={logoUrl}
						logoDarkInvert={logoDarkInvert}
						scheduleStatus={scheduleStatus}
						exhibitorsEnabled={exhibitorsEnabled}
						feeEnabled={feeEnabled}
						financesEnabled={financesEnabled}
						hasDocuments={hasDocuments}
					/>
				</div>
				<main className="flex flex-1 flex-col overflow-auto bg-background shadow-lg md:m-2 md:rounded-2xl">
					<EmailVerificationBanner />
					<div className="flex flex-1 flex-col overflow-auto min-h-0">
						{children}
					</div>
					{footerText && (
						<footer className="border-t px-4 py-3 text-center text-xs text-muted-foreground">
							{footerText}
						</footer>
					)}
				</main>
			</div>
		</div>
	);
}
