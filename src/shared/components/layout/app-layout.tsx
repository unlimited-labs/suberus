import { IconHexagonLetterS } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { EmailVerificationBanner } from "@/shared/components/email-verification-banner";
import { cn } from "@/shared/lib/utils";
import { MobileSidebar, Sidebar } from "./sidebar";

interface AppLayoutProps {
	children: ReactNode;
	conferenceName: string;
	logoUrl: string;
	footerText: string;
	logoDarkInvert: boolean;
}

export function AppLayout({
	children,
	conferenceName,
	logoUrl,
	footerText,
	logoDarkInvert,
}: AppLayoutProps) {
	return (
		<div className="flex h-screen bg-sidebar">
			<Sidebar
				conferenceName={conferenceName}
				logoUrl={logoUrl}
				logoDarkInvert={logoDarkInvert}
			/>
			<div className="flex flex-1 flex-col overflow-hidden">
				{/* Mobile header with hamburger */}
				<div className="flex h-14 items-center px-4 md:hidden">
					<MobileSidebar
						conferenceName={conferenceName}
						logoUrl={logoUrl}
						logoDarkInvert={logoDarkInvert}
					/>
					<div className="ml-3 flex items-center gap-3">
						{logoUrl ? (
							<img
								src={logoUrl}
								alt="Logo"
								className={cn(
									"h-7 w-auto object-contain",
									logoDarkInvert && "dark:invert dark:grayscale",
								)}
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
