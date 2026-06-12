import { IconBuildingStore, IconLoader2 } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { SettingsSection } from "@/components/settings/settings-section";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { getErrorMessage } from "@/lib/error-message";
import type { SubmissionTypeConfig } from "@/lib/settings/types";
import {
	submissionTypesConfigQueryOptions,
	updateSubmissionTypeConfigFn,
} from "@/server-fns/settings";

interface ExhibitorsSettingsSectionProps {
	initialConfig: SubmissionTypeConfig;
	delay?: number;
}

export function ExhibitorsSettingsSection({
	initialConfig,
	delay,
}: ExhibitorsSettingsSectionProps) {
	const queryClient = useQueryClient();
	const [config, setConfig] = useState(initialConfig);
	const [isSaving, setIsSaving] = useState(false);

	const handleToggle = (
		field: "isActive" | "includeInPlanner" | "allowExhibitorPresentation",
		checked: boolean,
	) => {
		setConfig((prev) => ({ ...prev, [field]: checked }));
	};

	const handleSave = async () => {
		setIsSaving(true);
		try {
			await updateSubmissionTypeConfigFn({
				data: { type: "SUBMISSION_TYPE_EXHIBITOR", config },
			});
			await queryClient.invalidateQueries({
				queryKey: submissionTypesConfigQueryOptions().queryKey,
			});
			toast.success("Exhibitor settings saved");
		} catch (error) {
			toast.error(getErrorMessage(error, "Failed to save"));
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<SettingsSection
			icon={IconBuildingStore}
			title="Exhibitors"
			description="Exhibitor registration and presentation options"
			delay={delay}
		>
			<div className="space-y-4">
				{/* Master guard: gates exhibitor signup, the admin menu entry and the options below */}
				<div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
					<div>
						<Label htmlFor="exhibitorsEnabled">Enable exhibitors</Label>
						<p className="text-xs text-muted-foreground">
							Companies can register exhibitor accounts; enables the Exhibitors
							admin panel
						</p>
					</div>
					<Switch
						id="exhibitorsEnabled"
						data-testid="settings-exhibitors-enabled"
						checked={config.isActive}
						onCheckedChange={(checked) => handleToggle("isActive", checked)}
					/>
				</div>
				{config.isActive && (
					<>
						<div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
							<div>
								<Label htmlFor="exhibitorsIncludeInPlanner">
									Include in program planner
								</Label>
								<p className="text-xs text-muted-foreground">
									Approved exhibitor presentations appear in the planner pool
								</p>
							</div>
							<Switch
								id="exhibitorsIncludeInPlanner"
								data-testid="settings-exhibitors-include-in-planner"
								checked={config.includeInPlanner}
								onCheckedChange={(checked) =>
									handleToggle("includeInPlanner", checked)
								}
							/>
						</div>
						<div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
							<div>
								<Label htmlFor="exhibitorsAllowPresentation">
									Allow presentation
								</Label>
								<p className="text-xs text-muted-foreground">
									Exhibitors can optionally submit a company presentation
								</p>
							</div>
							<Switch
								id="exhibitorsAllowPresentation"
								data-testid="settings-exhibitors-allow-presentation"
								checked={config.allowExhibitorPresentation}
								onCheckedChange={(checked) =>
									handleToggle("allowExhibitorPresentation", checked)
								}
							/>
						</div>
					</>
				)}
			</div>
			<div className="mt-6 flex justify-end">
				<Button onClick={handleSave} disabled={isSaving}>
					{isSaving && <IconLoader2 className="mr-2 size-4 animate-spin" />}
					Save
				</Button>
			</div>
		</SettingsSection>
	);
}
