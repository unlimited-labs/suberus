import { IconClock, IconLoader2 } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SettingsSection } from "@/components/settings/settings-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TimezoneCombobox } from "@/components/ui/timezone-combobox";
import type { ConferenceSettings } from "@/utils/settings.functions";
import {
	conferenceSettingsQueryOptions,
	updateConferenceSettingsFn,
} from "@/utils/settings.functions";

interface PlannerSettingsTabProps {
	initialData: ConferenceSettings;
}

export function PlannerSettingsTab({ initialData }: PlannerSettingsTabProps) {
	const queryClient = useQueryClient();
	const router = useRouter();
	const [data, setData] = useState(initialData);
	const [isSaving, setIsSaving] = useState(false);
	const timezoneFromBrowser = initialData.timezone === "";

	useEffect(() => {
		if (initialData.timezone === "") {
			const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
			if (browserTz) {
				setData((prev) => ({ ...prev, timezone: browserTz }));
			}
		}
	}, [initialData.timezone]);

	const handleSave = async () => {
		setIsSaving(true);
		try {
			await updateConferenceSettingsFn({ data });
			await queryClient.invalidateQueries({
				queryKey: conferenceSettingsQueryOptions().queryKey,
			});
			await router.invalidate();
			toast.success("Planner settings saved");
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Failed to save");
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div className="space-y-6">
			<SettingsSection
				icon={IconClock}
				title="Planner"
				description="Settings used by the program planner to organize presentations into sessions across rooms and days"
			>
				<div className="grid gap-6 sm:grid-cols-2">
					<div className="space-y-2">
						<Label htmlFor="timezone">Conference timezone</Label>
						<TimezoneCombobox
							id="timezone"
							value={data.timezone}
							onChange={(v) => setData((prev) => ({ ...prev, timezone: v }))}
						/>
						<p className="text-xs text-muted-foreground">
							{timezoneFromBrowser
								? "Detected from your browser. Click Save to confirm."
								: "All session start/end times are stored in UTC and displayed in this zone."}
						</p>
					</div>

					<div className="space-y-2">
						<Label htmlFor="dayStart">Planner visible hours</Label>
						<div className="flex items-center gap-2">
							<Input
								id="dayStart"
								type="time"
								value={data.dayStart}
								onChange={(e) =>
									setData((prev) => ({ ...prev, dayStart: e.target.value }))
								}
								className="w-32"
							/>
							<span className="text-muted-foreground">-</span>
							<Input
								id="dayEnd"
								type="time"
								value={data.dayEnd}
								onChange={(e) =>
									setData((prev) => ({ ...prev, dayEnd: e.target.value }))
								}
								className="w-32"
							/>
						</div>
						<p className="text-xs text-muted-foreground">
							The time range visible on the planner grid each day. Sessions
							outside this window still exist — only the default view is
							clipped. Also used as the denominator in capacity calculations.
						</p>
					</div>

					<div className="space-y-2">
						<Label htmlFor="defaultPresentationMin">
							Default presentation length
						</Label>
						<div className="flex items-center gap-2">
							<Input
								id="defaultPresentationMin"
								type="number"
								min={5}
								max={480}
								step={5}
								value={data.defaultPresentationMin}
								onChange={(e) =>
									setData((prev) => ({
										...prev,
										defaultPresentationMin: Number(e.target.value) || 15,
									}))
								}
								className="w-24"
							/>
							<span className="text-sm text-muted-foreground">minutes</span>
						</div>
						<p className="text-xs text-muted-foreground">
							Pre-filled when creating sessions, when dropping a submission onto
							a session, and used as the slot unit in capacity.
						</p>
					</div>
				</div>

				<div className="mt-6 flex justify-end">
					<Button onClick={handleSave} disabled={isSaving}>
						{isSaving && <IconLoader2 className="mr-2 size-4 animate-spin" />}
						Save
					</Button>
				</div>
			</SettingsSection>
		</div>
	);
}
