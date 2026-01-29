import { IconMenu2 } from "@tabler/icons-react";
import { Link, useLocation } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useSession } from "@/hooks/use-session";
import { getNavigationForRole } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { UserMenu } from "./user-menu";

function SidebarContent() {
	const location = useLocation();
	const { user } = useSession();
	const sections = getNavigationForRole(user?.role ?? "AUTHOR");

	return (
		<div className="flex h-full flex-col">
			{/* Logo & Conference */}
			<div className="px-4 py-4">
				<Link to="/" className="block">
					<img src="/logo.png" alt="Suberus" className="h-16 w-auto" />
				</Link>
				<div className="mt-3 border-l-4 border-primary pl-3">
					<p className="text-sm font-semibold uppercase tracking-widest text-sidebar-foreground">
						ICSE 2025
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
									location.pathname === item.href ||
									(item.href !== "/" &&
										location.pathname.startsWith(item.href));
								return (
									<Link
										key={item.href}
										to={item.href}
										className={cn(
											"flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
											isActive
												? "bg-sidebar-primary text-sidebar-primary-foreground"
												: "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
										)}
									>
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

export function Sidebar() {
	return (
		<aside className="hidden w-56 shrink-0 bg-sidebar md:flex md:flex-col">
			<SidebarContent />
		</aside>
	);
}

export function MobileSidebar() {
	return (
		<Sheet>
			<SheetTrigger asChild>
				<Button variant="ghost" size="icon" className="md:hidden">
					<IconMenu2 />
					<span className="sr-only">Menu</span>
				</Button>
			</SheetTrigger>
			<SheetContent side="left" className="w-64 p-0" showCloseButton={false}>
				<SidebarContent />
			</SheetContent>
		</Sheet>
	);
}
