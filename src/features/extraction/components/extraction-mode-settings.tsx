import { IconFileSearch } from "@tabler/icons-react";
import { SettingsSection } from "@/features/settings/components/settings-section";
import type { AppSettingsMap } from "@/features/settings/types";
import {
	formatLlmStatus,
	formatPdfApiStatus,
} from "@/shared/lib/format-llm-status";
import { cn } from "@/shared/lib/utils";
import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";
import { EngineToggle } from "./engine-toggle";

interface ExtractionModeSettingsProps {
	enabled: boolean;
	onEnabledChange: (enabled: boolean) => void;
	heuristic: boolean;
	onHeuristicChange: (enabled: boolean) => void;
	ai: boolean;
	onAiChange: (enabled: boolean) => void;
	llmHealth: AppSettingsMap["SERVICE_HEALTH_LLM"];
	pdfApiHealth: AppSettingsMap["SERVICE_HEALTH_PDF_API"];
}

export function ExtractionModeSettings({
	enabled,
	onEnabledChange,
	heuristic,
	onHeuristicChange,
	ai,
	onAiChange,
	llmHealth,
	pdfApiHealth,
}: ExtractionModeSettingsProps) {
	const llmAvailable = llmHealth.status === "healthy";

	return (
		<SettingsSection
			delay={250}
			description="Automatically extract metadata (title, authors, keywords) from uploaded DOCX files"
			icon={IconFileSearch}
			title="Document Extraction"
		>
			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<div className="space-y-0.5">
						<Label htmlFor="extractionEnabled">
							Enable automatic extraction
						</Label>
						<p className="text-sm text-muted-foreground">
							Pre-fill submission form fields from uploaded documents
						</p>
					</div>
					<Switch
						checked={enabled}
						id="extractionEnabled"
						onCheckedChange={onEnabledChange}
					/>
				</div>

				{enabled ? (
					<div className="space-y-3">
						<Label className="text-sm font-medium">Extraction engines</Label>

						<EngineToggle
							checked={heuristic}
							description="Extracts metadata based on document structure and formatting conventions. Processes instantly, no additional infrastructure required."
							footer={
								<StatusBadge
									label={formatPdfApiStatus(pdfApiHealth)}
									status={pdfApiHealth.status}
								/>
							}
							id="extraction-heuristic"
							label="Structure-based extraction"
							onCheckedChange={onHeuristicChange}
						/>

						<EngineToggle
							checked={ai}
							description="Uses an AI model for enhanced extraction accuracy. When combined with structure-based, acts as a fallback for low-confidence results. Longer processing times."
							disabled={!llmAvailable}
							footer={
								<StatusBadge
									label={formatLlmStatus(llmHealth)}
									status={llmHealth.status}
								/>
							}
							id="extraction-ai"
							label="AI-assisted extraction"
							onCheckedChange={onAiChange}
							warning={
								llmHealth.status === "misconfigured"
									? `LLM service is reachable but the configured model is invalid. ${llmHealth.message} AI extraction stays disabled until the model name is corrected.`
									: !llmAvailable
										? "LLM API is not available. Configure LLM_API_URL environment variable and ensure the service is running."
										: undefined
							}
						/>

						{!heuristic && !ai ? (
							<p className="text-xs text-destructive">
								At least one extraction engine must be enabled.
							</p>
						) : null}
					</div>
				) : null}
			</div>
		</SettingsSection>
	);
}

function StatusBadge({
	status,
	label,
}: {
	status: "healthy" | "unavailable" | "misconfigured";
	label: string;
}) {
	const dot =
		status === "healthy"
			? "bg-green-500"
			: status === "misconfigured"
				? "bg-yellow-500"
				: "bg-red-500";
	return (
		<div className="flex items-center gap-1.5">
			<div className={cn("size-1.5 rounded-full", dot)} />
			<span className="text-[11px] text-muted-foreground">{label}</span>
		</div>
	);
}
