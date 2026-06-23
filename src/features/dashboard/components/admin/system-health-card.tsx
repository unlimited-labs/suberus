import type { AdminDashboardMetrics } from "@/features/dashboard/server/admin-dashboard";
import { cn } from "@/shared/lib/utils";
import { SectionCard } from "@/shared/ui/section-card";
import {
	buildServiceRows,
	type ServiceRow as ServiceRowData,
	STATUS_STYLES,
} from "./system-health-rows";

interface SystemHealthCardProps {
	s3: AdminDashboardMetrics["s3"] | undefined;
	smtp: AdminDashboardMetrics["smtp"] | undefined;
	llm: AdminDashboardMetrics["llm"] | undefined;
	pdfApi: AdminDashboardMetrics["pdfApi"] | undefined;
}

function ServiceRow({ service }: { service: ServiceRowData }) {
	const styles = STATUS_STYLES[service.status];
	return (
		<div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
			<service.icon className="size-5 shrink-0 text-muted-foreground" />
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2">
					<span className={cn("size-2 shrink-0 rounded-full", styles.dot)} />
					<span className="text-sm font-medium">{service.name}</span>
					<span className={cn("text-xs font-medium capitalize", styles.label)}>
						{service.status}
					</span>
				</div>
				<p className="mt-1 truncate text-xs text-muted-foreground">
					{service.detail}
				</p>
			</div>
		</div>
	);
}

export function SystemHealthCard({
	s3,
	smtp,
	llm,
	pdfApi,
}: SystemHealthCardProps) {
	const services = buildServiceRows({ s3, smtp, llm, pdfApi });

	return (
		<SectionCard title="System Health">
			<div className="grid gap-3 sm:grid-cols-2">
				{services.map((service) => (
					<ServiceRow key={service.name} service={service} />
				))}
			</div>
		</SectionCard>
	);
}
