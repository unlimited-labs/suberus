import { IconExternalLink } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import type { NavItem } from "@/shared/components/layout/navigation";
import { cn } from "@/shared/lib/utils";

const CLASS =
	"flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors";
const ACTIVE = "bg-sidebar-primary text-sidebar-primary-foreground";
const INACTIVE =
	"text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground";

export function NavLink({
	item,
	active,
	onNavigate,
}: {
	item: NavItem;
	active: boolean;
	onNavigate?: () => void;
}) {
	const className = cn(CLASS, active ? ACTIVE : INACTIVE);
	if (item.external) {
		return (
			<a
				className={className}
				href={item.href}
				onClick={onNavigate}
				rel="noopener noreferrer"
				target="_blank"
			>
				<item.icon className="size-5" />
				<span className="flex-1">{item.name}</span>
				<IconExternalLink className="size-3.5 opacity-60" />
			</a>
		);
	}
	return (
		<Link className={className} onClick={onNavigate} to={item.href}>
			<item.icon className="size-5" />
			{item.name}
		</Link>
	);
}
