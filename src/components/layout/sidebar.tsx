import { IconExternalLink, IconMenu2 } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "@tanstack/react-router";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { useSession } from "@/hooks/use-session";
import { getNavigationForRole } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { scheduleStateQueryOptions } from "@/server-fns/planner/schedule";
import { BrandLogo } from "./brand-logo";
import { UserMenu } from "./user-menu";

interface SidebarProps {
	conferenceName: string;
	logoUrl: string;
	logoDarkInvert: boolean;
}

function SidebarContent({
	conferenceName,
	logoUrl,
	logoDarkInvert,
}: SidebarProps) {
	const location = useLocation();
	const { user } = useSession();
	const { data: scheduleState } = useQuery(scheduleStateQueryOptions());
	const status = scheduleState?.status;
	const role = user?.role ?? "AUTHOR";
	const canSeeDraft = role === "ADMIN" || role === "EDITOR";
	const programVisible =
		status === "PUBLISHED" || (status === "DRAFT_PUBLISHED" && canSeeDraft);
	const sections = useMemo(
		() =>
			getNavigationForRole(role)
				.map((section) => ({
					...section,
					items: section.items.filter(
						(item) => !item.requiresPublishedSchedule || programVisible,
					),
				}))
				.filter((section) => section.items.length > 0),
		[role, programVisible],
	);

	return (
		<div className="flex h-full flex-col">
			{/* Logo & Conference */}
			<div className="px-4 py-4">
				<Link to="/" className="block">
					<BrandLogo
						logoUrl={logoUrl}
						logoDarkInvert={logoDarkInvert}
						alt="Suberus"
						className="h-22 w-auto mx-auto"
					/>
				</Link>
				<div className="mt-3 border-l-4 border-primary pl-3">
					<p className="text-sm font-semibold uppercase tracking-widest text-sidebar-foreground">
						{conferenceName}
					</p>
				</div>
			</div>

			{/* Navigation */}
			<nav className="flex-1 overflow-auto p-3">
				{sections.map((section, sectionIndex) => (
					<div key={sectionIndex} className={cn(sectionIndex > 0 && "mt-4")}>
						{section.title && (
							<p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60">
								{section.title}
							</p>
						)}
						<div className="flex flex-col gap-1">
							{section.items.map((item) => {
								const isActive =
									!item.external &&
									(location.pathname === item.href ||
										(item.href !== "/" &&
											location.pathname.startsWith(item.href)));
								const className = cn(
									"flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
									isActive
										? "bg-sidebar-primary text-sidebar-primary-foreground"
										: "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
								);
								if (item.external) {
									return (
										<a
											key={item.href}
											href={item.href}
											target="_blank"
											rel="noopener noreferrer"
											className={className}
										>
											<item.icon className="size-5" />
											<span className="flex-1">{item.name}</span>
											<IconExternalLink className="size-3.5 opacity-60" />
										</a>
									);
								}
								return (
									<Link key={item.href} to={item.href} className={className}>
										<item.icon className="size-5" />
										{item.name}
									</Link>
								);
							})}
						</div>
					</div>
				))}
			</nav>

			{/* User at bottom */}
			<div className="p-3">
				<UserMenu />
			</div>
		</div>
	);
}

export function Sidebar({
	conferenceName,
	logoUrl,
	logoDarkInvert,
}: SidebarProps) {
	return (
		<aside className="hidden w-56 shrink-0 bg-sidebar md:flex md:flex-col">
			<SidebarContent
				conferenceName={conferenceName}
				logoUrl={logoUrl}
				logoDarkInvert={logoDarkInvert}
			/>
		</aside>
	);
}

export function MobileSidebar({
	conferenceName,
	logoUrl,
	logoDarkInvert,
}: SidebarProps) {
	return (
		<Sheet>
			<SheetTrigger asChild>
				<Button variant="ghost" size="icon" className="md:hidden">
					<IconMenu2 />
					<span className="sr-only">Menu</span>
				</Button>
			</SheetTrigger>
			<SheetContent side="left" className="w-64 p-0" showCloseButton={false}>
				<SheetTitle className="sr-only">Navigation menu</SheetTitle>
				<SheetDescription className="sr-only">
					Main application navigation.
				</SheetDescription>
				<SidebarContent
					conferenceName={conferenceName}
					logoUrl={logoUrl}
					logoDarkInvert={logoDarkInvert}
				/>
			</SheetContent>
		</Sheet>
	);
}
