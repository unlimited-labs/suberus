import { IconMenu2 } from "@tabler/icons-react";
import { Link, useLocation } from "@tanstack/react-router";
import { useState } from "react";
import { NavLink } from "@/shared/components/layout/nav-link";
import {
	getNavigationForRole,
	isNavItemActive,
	isNavItemVisible,
} from "@/shared/components/layout/navigation";
import { useSession } from "@/shared/hooks/use-session";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetTitle,
	SheetTrigger,
} from "@/shared/ui/sheet";
import { BrandLogo } from "./brand-logo";
import { UserMenu } from "./user-menu";

interface SidebarProps {
	conferenceName: string;
	logoUrl: string;
	logoDarkInvert: boolean;
	/** Planner schedule status + exhibitor-signup flag are supplied by the route
	 * (which may import those slices), keeping this shared layout decoupled from
	 * the planner/exhibitors features. */
	scheduleStatus?: string;
	exhibitorsEnabled: boolean;
	feeEnabled: boolean;
	financesEnabled: boolean;
	/** Whether the signed-in user has ≥1 generated document (gates "My Documents"). */
	hasDocuments: boolean;
}

function SidebarContent({
	conferenceName,
	logoUrl,
	logoDarkInvert,
	scheduleStatus,
	exhibitorsEnabled,
	feeEnabled,
	financesEnabled,
	hasDocuments,
	onNavigate,
}: SidebarProps & { onNavigate?: () => void }) {
	const location = useLocation();
	const { user } = useSession();
	const role = user?.role ?? "AUTHOR";
	const canSeeDraft = role === "ADMIN" || role === "EDITOR";
	const programVisible =
		scheduleStatus === "PUBLISHED" ||
		(scheduleStatus === "DRAFT_PUBLISHED" && canSeeDraft);
	const gates = {
		programVisible,
		exhibitorsEnabled,
		feeEnabled,
		financesEnabled,
		hasDocuments,
	};
	const sections = getNavigationForRole(role)
		.map((section) => ({
			...section,
			items: section.items.filter((item) => isNavItemVisible(item, gates)),
		}))
		.filter((section) => section.items.length > 0);

	return (
		<div className="flex h-full flex-col">
			<div className="px-4 py-4">
				<Link className="block" to="/">
					<BrandLogo
						alt="Suberus"
						className="h-22 w-auto mx-auto"
						logoDarkInvert={logoDarkInvert}
						logoUrl={logoUrl}
					/>
				</Link>
				<div className="mt-3 border-l-4 border-primary pl-3">
					<p className="text-sm font-semibold uppercase tracking-widest text-sidebar-foreground">
						{conferenceName}
					</p>
				</div>
			</div>

			<nav className="flex-1 overflow-auto p-3">
				{sections.map((section, sectionIndex) => (
					<div className={cn(sectionIndex > 0 && "mt-4")} key={sectionIndex}>
						{section.title && (
							<p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60">
								{section.title}
							</p>
						)}
						<div className="flex flex-col gap-1">
							{section.items.map((item) => (
								<NavLink
									active={isNavItemActive(item, location.pathname)}
									item={item}
									key={item.href}
									onNavigate={onNavigate}
								/>
							))}
						</div>
					</div>
				))}
			</nav>

			<div className="p-3">
				<UserMenu />
			</div>
		</div>
	);
}

export function Sidebar(props: SidebarProps) {
	return (
		<aside className="hidden w-56 shrink-0 bg-sidebar md:flex md:flex-col">
			<SidebarContent {...props} />
		</aside>
	);
}

export function MobileSidebar(props: SidebarProps) {
	const [open, setOpen] = useState(false);
	return (
		<Sheet onOpenChange={setOpen} open={open}>
			<SheetTrigger asChild>
				<Button className="md:hidden" size="icon" variant="ghost">
					<IconMenu2 />
					<span className="sr-only">Menu</span>
				</Button>
			</SheetTrigger>
			<SheetContent className="w-64 p-0" showCloseButton={false} side="left">
				<SheetTitle className="sr-only">Navigation menu</SheetTitle>
				<SheetDescription className="sr-only">
					Main application navigation.
				</SheetDescription>
				<SidebarContent {...props} onNavigate={() => setOpen(false)} />
			</SheetContent>
		</Sheet>
	);
}
