import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { BrandLogo } from "@/shared/components/layout/brand-logo";

interface AuthLayoutProps {
	children: ReactNode;
	logoUrl: string;
	backgroundImageUrl?: string;
	overlayOpacity?: number;
	logoDarkInvert?: boolean;
}

export function AuthLayout({
	children,
	logoUrl,
	backgroundImageUrl,
	overlayOpacity = 60,
	logoDarkInvert = true,
}: AuthLayoutProps) {
	return (
		<div className="relative flex min-h-svh w-full items-center justify-center overflow-hidden bg-background">
			{backgroundImageUrl ? (
				<>
					<div
						data-testid="auth-background-image"
						className="pointer-events-none fixed inset-0 bg-cover bg-center bg-no-repeat"
						style={{ backgroundImage: `url(${backgroundImageUrl})` }}
					/>
					<div
						className="pointer-events-none fixed inset-0"
						style={{ backgroundColor: `rgba(0,0,0,${overlayOpacity / 100})` }}
					/>
				</>
			) : (
				<>
					<div
						className="pointer-events-none fixed inset-0"
						style={{
							background: `
								radial-gradient(ellipse 80% 50% at 20% 10%, oklch(0.6231 0.1880 259.8145 / 0.12), transparent),
								radial-gradient(ellipse 60% 40% at 80% 90%, oklch(0.3791 0.1378 265.5222 / 0.08), transparent),
								radial-gradient(ellipse 100% 80% at 50% 50%, oklch(0.4882 0.2172 264.3763 / 0.04), transparent)
							`,
						}}
					/>

					<div
						className="pointer-events-none fixed inset-0 opacity-[0.015] dark:opacity-[0.03]"
						style={{
							backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
							backgroundRepeat: "repeat",
							backgroundSize: "256px 256px",
						}}
					/>

					<div
						className="pointer-events-none fixed inset-0 opacity-[0.02] dark:opacity-[0.04]"
						style={{
							backgroundImage: `
								linear-gradient(oklch(0.5 0 0 / 0.5) 1px, transparent 1px),
								linear-gradient(90deg, oklch(0.5 0 0 / 0.5) 1px, transparent 1px)
							`,
							backgroundSize: "64px 64px",
						}}
					/>
				</>
			)}

			<header className="fixed inset-x-0 top-0 z-20 flex justify-center p-6 sm:inset-x-auto sm:left-0 sm:justify-start sm:p-6 lg:p-8">
				<Link to="/" className="group block">
					<div className="flex items-center gap-3">
						<BrandLogo
							logoUrl={logoUrl}
							logoDarkInvert={logoDarkInvert}
							alt="Conference Logo"
							className="h-24 w-auto transition-transform duration-300 group-hover:scale-105 sm:h-10 lg:h-28"
						/>
					</div>
				</Link>
			</header>

			<div className="pointer-events-none fixed -right-32 -top-32 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
			<div className="pointer-events-none fixed -bottom-32 -left-32 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />

			<main className="relative z-10 w-full px-4 py-32 sm:px-6 sm:py-20 lg:px-8">
				<div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
					{children}
				</div>
			</main>
		</div>
	);
}
