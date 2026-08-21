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
import { Switch } from "@/shared/ui/switch";
import { PROGRAM_THEME_LIST } from "../public-program/themes/registry";

export function ProgramThemeSection() {
	const queryClient = useQueryClient();
	const { data: theme } = useQuery(adminSettingQueryOptions("PROGRAM_THEME"));
	const { data: showAuthorInfo } = useQuery(
		adminSettingQueryOptions("PROGRAM_SHOW_AUTHOR_INFO"),
	);

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

	const authorInfoMutation = useMutation({
		mutationFn: (value: boolean) =>
			setSettingFn({ data: { key: "PROGRAM_SHOW_AUTHOR_INFO", value } }),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: ["settings", "admin", "PROGRAM_SHOW_AUTHOR_INFO"],
			});
			toast.success("Author info setting updated");
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const current = theme ?? "default";

	return (
		<SettingsSection
			description="Visual theme applied to the public program page."
			icon={IconPalette}
			title="Appearance"
		>
			<div className="max-w-sm space-y-2">
				<Label htmlFor="program-theme">Theme</Label>
				<Select
					disabled={mutation.isPending}
					items={PROGRAM_THEME_LIST.map((t) => ({
						value: t.id,
						label: t.name,
					}))}
					onValueChange={(value) => mutation.mutate(value)}
					value={current}
				>
					<SelectTrigger data-testid="program-theme-select" id="program-theme">
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
				<p className="text-muted-foreground text-xs">
					{PROGRAM_THEME_LIST.find((t) => t.id === current)?.description}
				</p>
			</div>
			<div className="mt-6 flex items-center justify-between gap-4 border-t pt-6">
				<div className="space-y-0.5">
					<Label htmlFor="show-author-info">
						Publish participant contact details
					</Label>
					<p className="text-muted-foreground text-xs">
						Adds an optional consent checkbox to registration and allow other
						participants to see contact details.
					</p>
				</div>
				<Switch
					checked={showAuthorInfo ?? false}
					data-testid="show-author-info-toggle"
					disabled={authorInfoMutation.isPending}
					id="show-author-info"
					onCheckedChange={(v) => authorInfoMutation.mutate(v === true)}
				/>
			</div>
		</SettingsSection>
	);
}
