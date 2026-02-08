import { IconHexagonLetterS } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { EmailVerificationBanner } from "@/components/email-verification-banner";
import { MobileSidebar, Sidebar } from "./sidebar";

interface AppLayoutProps {
	children: ReactNode;
	conferenceName: string;
	logoUrl: string;
	footerText: string;
}

export function AppLayout({
	children,
	conferenceName,
	logoUrl,
	footerText,
}: AppLayoutProps) {
	return (
		<div className="flex h-screen bg-sidebar">
			<Sidebar conferenceName={conferenceName} logoUrl={logoUrl} />
			<div className="flex flex-1 flex-col overflow-hidden">
				{/* Mobile header with hamburger */}
				<div className="flex h-14 items-center px-4 md:hidden">
					<MobileSidebar conferenceName={conferenceName} logoUrl={logoUrl} />
					<div className="ml-3 flex items-center gap-3">
						{logoUrl ? (
							<img
								src={logoUrl}
								alt="Logo"
								className="h-7 w-auto object-contain"
							/>
						) : (
							<IconHexagonLetterS className="size-7 text-primary" />
						)}
						<span className="font-serif text-2xl font-semibold tracking-tight">
							Suberus
						</span>
						<span className="border-l-4 border-primary pl-3 text-sm font-semibold uppercase tracking-widest">
							{conferenceName}
						</span>
					</div>
				</div>
				{/* Content card */}
				<main className="flex flex-1 flex-col overflow-auto bg-background shadow-lg md:m-2 md:rounded-2xl">
					<EmailVerificationBanner />
					<div className="flex-1 overflow-auto">{children}</div>
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
