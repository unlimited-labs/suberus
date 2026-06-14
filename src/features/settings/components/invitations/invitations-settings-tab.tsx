import { IconClock, IconLoader2 } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
	adminSettingQueryOptions,
	setSettingFn,
} from "@/features/settings/api/settings";
import { SettingsSection } from "@/features/settings/components/settings-section";
import { getErrorMessage } from "@/shared/lib/error-message";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

interface InvitationsSettingsTabProps {
	initialValidityHours: number;
}

export function InvitationsSettingsTab({
	initialValidityHours,
}: InvitationsSettingsTabProps) {
	const queryClient = useQueryClient();
	const [validityHours, setValidityHours] = useState(initialValidityHours);
	const [isSaving, setIsSaving] = useState(false);

	const handleSave = async () => {
		if (validityHours < 1) {
			toast.error("Validity must be at least 1 hour");
			return;
		}

		setIsSaving(true);
		try {
			await setSettingFn({
				data: { key: "INVITATION_VALIDITY_HOURS", value: validityHours },
			});
			await queryClient.invalidateQueries({
				queryKey: adminSettingQueryOptions("INVITATION_VALIDITY_HOURS")
					.queryKey,
			});
			toast.success("Invitation settings saved");
		} catch (error) {
			toast.error(getErrorMessage(error, "Failed to save settings"));
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<SettingsSection
			icon={IconClock}
			title="Invitation Settings"
			description="Configure invitation expiration"
		>
			<div className="space-y-3">
				<div className="space-y-2">
					<Label htmlFor="validityHours">Invitation validity (hours)</Label>
					<Input
						id="validityHours"
						type="number"
						min={1}
						value={validityHours}
						onChange={(e) => setValidityHours(Number(e.target.value))}
						className="max-w-[200px]"
					/>
					<p className="text-xs text-muted-foreground">
						How long invitation links remain valid after being sent.
					</p>
				</div>
				<div className="flex justify-end">
					<Button onClick={handleSave} disabled={isSaving} size="sm">
						{isSaving && <IconLoader2 className="mr-2 size-4 animate-spin" />}
						Save
					</Button>
				</div>
			</div>
		</SettingsSection>
	);
}
