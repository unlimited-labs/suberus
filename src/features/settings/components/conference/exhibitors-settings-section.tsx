import { IconBuildingStore, IconLoader2 } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { exhibitorSignupAvailableQueryOptions } from "@/features/exhibitors/api/exhibitors";
import {
	submissionTypesConfigQueryOptions,
	updateSubmissionTypeConfigFn,
} from "@/features/settings/api/settings";
import { SettingsSection } from "@/features/settings/components/settings-section";
import type { SubmissionTypeConfig } from "@/features/settings/types";
import { getErrorMessage } from "@/shared/lib/error-message";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";

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
			await Promise.all([
				queryClient.invalidateQueries({
					queryKey: submissionTypesConfigQueryOptions().queryKey,
				}),
				// Sidebar gates the Exhibitors menu entry on this query
				queryClient.invalidateQueries({
					queryKey: exhibitorSignupAvailableQueryOptions().queryKey,
				}),
			]);
			toast.success("Exhibitor settings saved");
		} catch (error) {
			toast.error(getErrorMessage(error, "Failed to save"));
		}
		setIsSaving(false);
	};

	return (
		<SettingsSection
			delay={delay}
			description="Exhibitor registration and presentation options"
			icon={IconBuildingStore}
			title="Exhibitors"
		>
			<div className="space-y-4">
				{/* Master guard: gates exhibitor signup, the admin menu entry and the options below */}
				<div className="border-border/50 flex items-center justify-between rounded-lg border p-3">
					<div>
						<Label htmlFor="exhibitorsEnabled">Enable exhibitors</Label>
						<p className="text-muted-foreground text-xs">
							Companies can register exhibitor accounts; enables the Exhibitors
							admin panel
						</p>
					</div>
					<Switch
						checked={config.isActive}
						data-testid="settings-exhibitors-enabled"
						id="exhibitorsEnabled"
						onCheckedChange={(checked) => handleToggle("isActive", checked)}
					/>
				</div>
				{config.isActive && (
					<>
						<div className="border-border/50 flex items-center justify-between rounded-lg border p-3">
							<div>
								<Label htmlFor="exhibitorsIncludeInPlanner">
									Include in program planner
								</Label>
								<p className="text-muted-foreground text-xs">
									Approved exhibitor presentations appear in the planner pool
								</p>
							</div>
							<Switch
								checked={config.includeInPlanner}
								data-testid="settings-exhibitors-include-in-planner"
								id="exhibitorsIncludeInPlanner"
								onCheckedChange={(checked) =>
									handleToggle("includeInPlanner", checked)
								}
							/>
						</div>
						<div className="border-border/50 flex items-center justify-between rounded-lg border p-3">
							<div>
								<Label htmlFor="exhibitorsAllowPresentation">
									Allow presentation
								</Label>
								<p className="text-muted-foreground text-xs">
									Exhibitors can optionally submit a company presentation
								</p>
							</div>
							<Switch
								checked={config.allowExhibitorPresentation}
								data-testid="settings-exhibitors-allow-presentation"
								id="exhibitorsAllowPresentation"
								onCheckedChange={(checked) =>
									handleToggle("allowExhibitorPresentation", checked)
								}
							/>
						</div>
					</>
				)}
			</div>
			<div className="mt-6 flex justify-end">
				<Button disabled={isSaving} onClick={handleSave}>
					{isSaving && <IconLoader2 className="mr-2 size-4 animate-spin" />}
					Save
				</Button>
			</div>
		</SettingsSection>
	);
}
