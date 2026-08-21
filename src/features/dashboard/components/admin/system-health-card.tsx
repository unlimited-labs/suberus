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
	docxApi: AdminDashboardMetrics["docxApi"] | undefined;
}

function ServiceRow({ service }: { service: ServiceRowData }) {
	const styles = STATUS_STYLES[service.status];
	return (
		<div className="border-border bg-card flex items-center gap-3 rounded-lg border p-3">
			<service.icon className="text-muted-foreground size-5 shrink-0" />
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2">
					<span className={cn("size-2 shrink-0 rounded-full", styles.dot)} />
					<span className="text-sm font-medium">{service.name}</span>
					<span className={cn("text-xs font-medium capitalize", styles.label)}>
						{service.status}
					</span>
				</div>
				<p className="text-muted-foreground mt-1 truncate text-xs">
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
	docxApi,
}: SystemHealthCardProps) {
	const services = buildServiceRows({ s3, smtp, llm, pdfApi, docxApi });

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
