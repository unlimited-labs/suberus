import {
	IconBrain,
	IconDatabase,
	IconFileText,
	IconMail,
} from "@tabler/icons-react";
import { formatLlmStatus } from "@/lib/format-llm-status";
import type { AdminDashboardMetrics } from "@/lib/server/admin/dashboard";
import { cn } from "@/shared/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

interface SystemHealthCardProps {
	s3: AdminDashboardMetrics["s3"] | undefined;
	smtp: AdminDashboardMetrics["smtp"] | undefined;
	llm: AdminDashboardMetrics["llm"] | undefined;
	docling: AdminDashboardMetrics["docling"] | undefined;
}

type ServiceStatus = "healthy" | "unavailable" | "error";

interface ServiceRow {
	icon: React.ComponentType<{ className?: string }>;
	name: string;
	status: ServiceStatus;
	detail: string;
}

const STATUS_STYLES: Record<ServiceStatus, { dot: string; label: string }> = {
	healthy: { dot: "bg-green-500", label: "text-green-600 dark:text-green-400" },
	unavailable: {
		dot: "bg-blue-500",
		label: "text-blue-600 dark:text-blue-400",
	},
	error: { dot: "bg-red-500", label: "text-red-600 dark:text-red-400" },
};

export function SystemHealthCard({
	s3,
	smtp,
	llm,
	docling,
}: SystemHealthCardProps) {
	const services: ServiceRow[] = [
		{
			icon: IconBrain,
			name: "LLM",
			status: llm?.status ?? "unavailable",
			detail: llm ? formatLlmStatus(llm) : "Unknown",
		},
		{
			icon: IconFileText,
			name: "Docling",
			status: docling?.status ?? "unavailable",
			detail:
				docling?.status === "healthy"
					? "PDF & DOCX to markdown conversion"
					: (docling?.message ?? "Unknown"),
		},
		{
			icon: IconDatabase,
			name: "Storage",
			status: s3?.status ?? "error",
			detail: s3
				? s3.status === "healthy"
					? `${s3.endpoint}/${s3.bucket}`
					: s3.message
				: "Unknown",
		},
		{
			icon: IconMail,
			name: "Email",
			status: smtp?.status ?? "error",
			detail: smtp
				? smtp.status === "healthy"
					? `${smtp.host}:${smtp.port}`
					: smtp.message
				: "Unknown",
		},
	];

	return (
		<Card>
			<CardHeader>
				<CardTitle>System Health</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="grid gap-3 sm:grid-cols-2">
					{services.map((service) => {
						const styles = STATUS_STYLES[service.status];
						return (
							<div
								key={service.name}
								className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
							>
								<service.icon className="size-5 shrink-0 text-muted-foreground" />
								<div className="min-w-0 flex-1">
									<div className="flex items-center gap-2">
										<span
											className={cn("size-2 shrink-0 rounded-full", styles.dot)}
										/>
										<span className="text-sm font-medium">{service.name}</span>
										<span
											className={cn(
												"text-xs font-medium capitalize",
												styles.label,
											)}
										>
											{service.status}
										</span>
									</div>
									<p className="mt-1 truncate text-xs text-muted-foreground">
										{service.detail}
									</p>
								</div>
							</div>
						);
					})}
				</div>
			</CardContent>
		</Card>
	);
}
