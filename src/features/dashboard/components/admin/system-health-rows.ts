import {
	IconBrain,
	IconDatabase,
	IconFileDiff,
	IconFileText,
	IconMail,
} from "@tabler/icons-react";
import type { AdminDashboardMetrics } from "@/features/dashboard/server/admin-dashboard";
import { formatLlmStatus } from "@/shared/lib/format-llm-status";

export type ServiceStatus =
	| "healthy"
	| "unavailable"
	| "misconfigured"
	| "error";

export interface ServiceRow {
	icon: React.ComponentType<{ className?: string }>;
	name: string;
	status: ServiceStatus;
	detail: string;
}

export const STATUS_STYLES: Record<
	ServiceStatus,
	{ dot: string; label: string }
> = {
	healthy: { dot: "bg-green-500", label: "text-green-600 dark:text-green-400" },
	unavailable: {
		dot: "bg-blue-500",
		label: "text-blue-600 dark:text-blue-400",
	},
	misconfigured: {
		dot: "bg-yellow-500",
		label: "text-yellow-600 dark:text-yellow-500",
	},
	error: { dot: "bg-red-500", label: "text-red-600 dark:text-red-400" },
};

type S3Metrics = AdminDashboardMetrics["s3"] | undefined;
type SmtpMetrics = AdminDashboardMetrics["smtp"] | undefined;
type LlmMetrics = AdminDashboardMetrics["llm"] | undefined;
type PdfApiMetrics = AdminDashboardMetrics["pdfApi"] | undefined;
type DocxApiMetrics = AdminDashboardMetrics["docxApi"] | undefined;

function llmDetail(llm: LlmMetrics): string {
	return llm ? formatLlmStatus(llm) : "Unknown";
}

function pdfApiDetail(pdfApi: PdfApiMetrics): string {
	if (pdfApi?.status === "healthy") return "PDF & DOCX to markdown conversion";
	return pdfApi?.message ?? "Unknown";
}

function docxApiDetail(docxApi: DocxApiMetrics): string {
	if (docxApi?.status === "healthy") return "DOCX structural redline";
	return docxApi?.message ?? "Unknown";
}

function s3Detail(s3: S3Metrics): string {
	if (!s3) return "Unknown";
	return s3.status === "healthy" ? `${s3.endpoint}/${s3.bucket}` : s3.message;
}

function smtpDetail(smtp: SmtpMetrics): string {
	if (!smtp) return "Unknown";
	return smtp.status === "healthy" ? `${smtp.host}:${smtp.port}` : smtp.message;
}

export function buildServiceRows({
	s3,
	smtp,
	llm,
	pdfApi,
	docxApi,
}: {
	s3: S3Metrics;
	smtp: SmtpMetrics;
	llm: LlmMetrics;
	pdfApi: PdfApiMetrics;
	docxApi: DocxApiMetrics;
}): ServiceRow[] {
	return [
		{
			icon: IconBrain,
			name: "LLM",
			status: llm?.status ?? "unavailable",
			detail: llmDetail(llm),
		},
		{
			icon: IconFileText,
			name: "PDF API",
			status: pdfApi?.status ?? "unavailable",
			detail: pdfApiDetail(pdfApi),
		},
		{
			icon: IconFileDiff,
			name: "DOCX API",
			status: docxApi?.status ?? "unavailable",
			detail: docxApiDetail(docxApi),
		},
		{
			icon: IconDatabase,
			name: "Storage",
			status: s3?.status ?? "error",
			detail: s3Detail(s3),
		},
		{
			icon: IconMail,
			name: "Email",
			status: smtp?.status ?? "error",
			detail: smtpDetail(smtp),
		},
	];
}
