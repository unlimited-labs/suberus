import { IconAward, IconPlus, IconTrash } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { saveProgramBadgesFn } from "@/features/planner/api/badges";
import { adminSettingQueryOptions } from "@/features/settings/api/settings";
import { SettingsSection } from "@/features/settings/components/settings-section";
import type { ProgramBadge } from "@/features/settings/types";
import { getErrorMessage } from "@/shared/lib/error-message";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/ui/select";
import { PresentationBadge } from "../public-program/presentation-badge";

const STYLES = [
	{ value: "badge", label: "Badge" },
	{ value: "ribbon", label: "Ribbon" },
] as const;

export function ProgramBadgesSection() {
	const queryClient = useQueryClient();
	const { data: saved } = useQuery(adminSettingQueryOptions("PROGRAM_BADGES"));
	const [badges, setBadges] = useState<ProgramBadge[]>([]);

	useEffect(() => {
		if (saved) setBadges(saved);
	}, [saved]);

	const mutation = useMutation({
		mutationFn: (value: ProgramBadge[]) => saveProgramBadgesFn({ data: value }),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: adminSettingQueryOptions("PROGRAM_BADGES").queryKey,
			});
			toast.success("Badges saved");
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const patch = (id: string, fields: Partial<ProgramBadge>) =>
		setBadges((prev) =>
			prev.map((b) => (b.id === id ? { ...b, ...fields } : b)),
		);

	return (
		<SettingsSection
			description="Highlight selected presentations on the public program. Assign a badge to a talk in the session editor."
			icon={IconAward}
			title="Presentation badges"
		>
			<div className="space-y-3">
				{badges.map((badge) => (
					<div
						className="flex flex-wrap items-end gap-2 rounded-md border p-3"
						data-testid={`program-badge-row-${badge.id}`}
						key={badge.id}
					>
						<div className="min-w-40 flex-1 space-y-1">
							<Label htmlFor={`badge-label-${badge.id}`}>Label</Label>
							<Input
								id={`badge-label-${badge.id}`}
								maxLength={24}
								onChange={(e) => patch(badge.id, { label: e.target.value })}
								value={badge.label}
							/>
						</div>
						<div className="space-y-1">
							<Label htmlFor={`badge-color-${badge.id}`}>Colour</Label>
							<Input
								className="h-9 w-14 cursor-pointer p-0.5"
								id={`badge-color-${badge.id}`}
								onChange={(e) => patch(badge.id, { color: e.target.value })}
								type="color"
								value={badge.color}
							/>
						</div>
						<div className="w-32 space-y-1">
							<Label htmlFor={`badge-style-${badge.id}`}>Style</Label>
							<Select
								items={STYLES.map((s) => ({ value: s.value, label: s.label }))}
								onValueChange={(value) =>
									patch(badge.id, {
										style: value === "ribbon" ? "ribbon" : "badge",
									})
								}
								value={badge.style}
							>
								<SelectTrigger id={`badge-style-${badge.id}`}>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{STYLES.map((s) => (
										<SelectItem key={s.value} value={s.value}>
											{s.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="flex h-9 items-center gap-2">
							<span className="relative inline-flex h-16 w-40 items-center overflow-hidden rounded-md border px-2">
								<PresentationBadge badge={badge} />
							</span>
							<Button
								aria-label={`Remove ${badge.label || "badge"}`}
								data-testid={`program-badge-remove-${badge.id}`}
								onClick={() =>
									setBadges((prev) => prev.filter((b) => b.id !== badge.id))
								}
								size="icon-sm"
								variant="ghost"
							>
								<IconTrash size={14} />
							</Button>
						</div>
					</div>
				))}
				{badges.length === 0 && (
					<p className="text-muted-foreground text-xs">No badges defined.</p>
				)}
				<div className="flex items-center gap-2">
					<Button
						data-testid="program-badge-add"
						disabled={badges.length >= 20}
						onClick={() =>
							setBadges((prev) => [
								...prev,
								{
									id: crypto.randomUUID(),
									label: "",
									color: "#dc2626",
									style: "badge",
								},
							])
						}
						size="sm"
						variant="outline"
					>
						<IconPlus size={14} />
						Add badge
					</Button>
					<Button
						data-testid="program-badge-save"
						disabled={mutation.isPending}
						onClick={() => {
							const trimmed = badges.map((b) => ({
								...b,
								label: b.label.trim(),
							}));
							if (trimmed.some((b) => !b.label)) {
								toast.error("Every badge needs a label");
								return;
							}
							setBadges(trimmed);
							mutation.mutate(trimmed);
						}}
						size="sm"
					>
						Save badges
					</Button>
				</div>
			</div>
		</SettingsSection>
	);
}
