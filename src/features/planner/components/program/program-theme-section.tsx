import { IconPalette } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	adminSettingQueryOptions,
	setSettingFn,
} from "@/features/settings/api/settings";
import { SettingsSection } from "@/features/settings/components/settings-section";
import { getErrorMessage } from "@/shared/lib/error-message";
import { Label } from "@/shared/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/ui/select";
import { PROGRAM_THEME_LIST } from "../public-program/themes/registry";

export function ProgramThemeSection() {
	const queryClient = useQueryClient();
	const { data: theme } = useQuery(adminSettingQueryOptions("PROGRAM_THEME"));

	const mutation = useMutation({
		mutationFn: (value: string) =>
			setSettingFn({ data: { key: "PROGRAM_THEME", value } }),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: ["settings", "admin", "PROGRAM_THEME"],
			});
			toast.success("Program theme updated");
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const current = theme ?? "default";

	return (
		<SettingsSection
			icon={IconPalette}
			title="Appearance"
			description="Visual theme applied to the public program page."
		>
			<div className="max-w-sm space-y-2">
				<Label htmlFor="program-theme">Theme</Label>
				<Select
					items={PROGRAM_THEME_LIST.map((t) => ({
						value: t.id,
						label: t.name,
					}))}
					value={current}
					onValueChange={(value) => mutation.mutate(value)}
					disabled={mutation.isPending}
				>
					<SelectTrigger id="program-theme" data-testid="program-theme-select">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{PROGRAM_THEME_LIST.map((t) => (
							<SelectItem key={t.id} value={t.id}>
								{t.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<p className="text-sm text-muted-foreground">
					{PROGRAM_THEME_LIST.find((t) => t.id === current)?.description}
				</p>
			</div>
		</SettingsSection>
	);
}
