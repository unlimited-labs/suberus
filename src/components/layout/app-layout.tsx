import type { ReactNode } from "react"
import { IconHexagonLetterS } from "@tabler/icons-react"
import { EmailVerificationBanner } from "@/components/email-verification-banner"
import { Sidebar, MobileSidebar } from "./sidebar"

interface AppLayoutProps {
	children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
	return (
		<div className="flex h-screen bg-sidebar">
			<Sidebar />
			<div className="flex flex-1 flex-col overflow-hidden">
				{/* Mobile header with hamburger */}
				<div className="flex h-14 items-center px-4 md:hidden">
					<MobileSidebar />
					<div className="ml-3 flex items-center gap-3">
						<IconHexagonLetterS className="size-7 text-primary" />
						<span className="font-serif text-2xl font-semibold tracking-tight">Suberus</span>
						<span className="border-l-4 border-primary pl-3 text-sm font-semibold uppercase tracking-widest">
							ICSE 2025
						</span>
					</div>
				</div>
				{/* Content card */}
				<main className="flex flex-1 flex-col overflow-auto bg-background shadow-lg md:m-2 md:rounded-2xl">
					<EmailVerificationBanner />
					<div className="flex-1 overflow-auto">{children}</div>
				</main>
			</div>
		</div>
	)
}
