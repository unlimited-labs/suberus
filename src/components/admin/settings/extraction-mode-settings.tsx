import { IconFileSearch } from "@tabler/icons-react";
import { SettingsSection } from "@/components/settings/settings-section";
import { formatDoclingStatus, formatLlmStatus } from "@/lib/format-llm-status";
import type { AppSettingsMap } from "@/lib/settings/types";
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
	doclingHealth: AppSettingsMap["SERVICE_HEALTH_DOCLING"];
}

export function ExtractionModeSettings({
	enabled,
	onEnabledChange,
	heuristic,
	onHeuristicChange,
	ai,
	onAiChange,
	llmHealth,
	doclingHealth,
}: ExtractionModeSettingsProps) {
	const llmAvailable = llmHealth.status === "healthy";
	const doclingAvailable = doclingHealth.status === "healthy";

	return (
		<SettingsSection
			icon={IconFileSearch}
			title="Document Extraction"
			description="Automatically extract metadata (title, authors, keywords) from uploaded DOCX files"
			delay={250}
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
						id="extractionEnabled"
						checked={enabled}
						onCheckedChange={onEnabledChange}
					/>
				</div>

				{enabled ? (
					<div className="space-y-3">
						<Label className="text-sm font-medium">Extraction engines</Label>

						<EngineToggle
							id="extraction-heuristic"
							label="Structure-based extraction"
							description="Extracts metadata based on document structure and formatting conventions. Processes instantly, no additional infrastructure required."
							checked={heuristic}
							onCheckedChange={onHeuristicChange}
							footer={
								<StatusBadge
									available={doclingAvailable}
									label={formatDoclingStatus(doclingHealth)}
								/>
							}
						/>

						<EngineToggle
							id="extraction-ai"
							label="AI-assisted extraction"
							description="Uses an AI model for enhanced extraction accuracy. When combined with structure-based, acts as a fallback for low-confidence results. Longer processing times."
							checked={ai}
							onCheckedChange={onAiChange}
							disabled={!llmAvailable}
							warning={
								!llmAvailable
									? "LLM API is not available. Configure LLM_API_URL environment variable and ensure the service is running."
									: undefined
							}
							footer={
								<StatusBadge
									available={llmAvailable}
									label={formatLlmStatus(llmHealth)}
								/>
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
	available,
	label,
}: {
	available: boolean;
	label: string;
}) {
	return (
		<div className="flex items-center gap-1.5">
			<div
				className={cn(
					"size-1.5 rounded-full",
					available ? "bg-green-500" : "bg-red-500",
				)}
			/>
			<span className="text-[11px] text-muted-foreground">{label}</span>
		</div>
	);
}
