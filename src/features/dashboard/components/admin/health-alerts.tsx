import {
	IconAlertCircle,
	IconAlertTriangle,
	IconInfoCircle,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import {
	buildHealthAlerts,
	type HealthAlert,
} from "@/features/dashboard/components/admin/health-alerts-data";
import type { AdminDashboardMetrics } from "@/features/dashboard/server/admin-dashboard";
import { cn } from "@/shared/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";

interface HealthAlertsProps {
	data: AdminDashboardMetrics["health"] | undefined;
	s3: AdminDashboardMetrics["s3"] | undefined;
	smtp: AdminDashboardMetrics["smtp"] | undefined;
}

const SEVERITY_STYLES = {
	destructive: {
		variant: "destructive",
		icon: IconAlertCircle,
		className: undefined,
		iconClass: "h-4 w-4",
		titleClass: undefined,
		descClass: undefined,
	},
	warning: {
		variant: "default",
		icon: IconAlertTriangle,
		className: "border-yellow-500 bg-yellow-50 dark:bg-yellow-950",
		iconClass: "h-4 w-4 text-yellow-600 dark:text-yellow-400",
		titleClass: "text-yellow-800 dark:text-yellow-200",
		descClass: "text-yellow-700 dark:text-yellow-300",
	},
	info: {
		variant: "default",
		icon: IconInfoCircle,
		className: "border-blue-500 bg-blue-50 dark:bg-blue-950",
		iconClass: "h-4 w-4 text-blue-600 dark:text-blue-400",
		titleClass: "text-blue-800 dark:text-blue-200",
		descClass: "text-blue-700 dark:text-blue-300",
	},
} satisfies Record<
	HealthAlert["severity"],
	{
		variant: "default" | "destructive";
		icon: React.ComponentType<{ className?: string }>;
		className?: string;
		iconClass: string;
		titleClass?: string;
		descClass?: string;
	}
>;

function HealthAlertCard({ alert }: { alert: HealthAlert }) {
	const style = SEVERITY_STYLES[alert.severity];
	const Icon = style.icon;
	return (
		<Alert className={style.className} variant={style.variant}>
			<Icon className={style.iconClass} />
			<AlertTitle className={style.titleClass}>{alert.title}</AlertTitle>
			<AlertDescription
				className={cn(
					alert.link && "flex items-center justify-between",
					style.descClass,
				)}
			>
				<span>{alert.message}</span>
				{alert.link && (
					<Button asChild size="sm" variant="outline">
						<Link to={alert.link.to}>{alert.link.label}</Link>
					</Button>
				)}
			</AlertDescription>
		</Alert>
	);
}

export function HealthAlerts({ data, s3, smtp }: HealthAlertsProps) {
	const alerts = buildHealthAlerts(data, s3, smtp);
	return (
		<>
			{alerts.map((alert) => (
				<HealthAlertCard alert={alert} key={alert.key} />
			))}
		</>
	);
}
