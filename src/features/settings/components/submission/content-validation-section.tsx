import { IconFileText } from "@tabler/icons-react";
import type { SubmissionValidationSettings } from "@/features/settings/api/settings";
import { SettingsSection } from "@/features/settings/components/settings-section";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";
import type { SubmissionSettingsHandleChange } from "./use-submission-settings";

interface ValidationFieldsProps {
	data: SubmissionValidationSettings;
	onChange: SubmissionSettingsHandleChange;
}

function TitleFields({ data, onChange }: ValidationFieldsProps) {
	return (
		<div className="space-y-3">
			<Label className="text-sm font-medium">Title</Label>
			<div className="grid gap-4 sm:grid-cols-2">
				<div className="space-y-2">
					<Label
						className="text-muted-foreground text-xs"
						htmlFor="minTitleLength"
					>
						Min length (characters)
					</Label>
					<Input
						id="minTitleLength"
						max={500}
						min={1}
						onChange={(e) =>
							onChange("minTitleLength", parseInt(e.target.value, 10) || 1)
						}
						type="number"
						value={data.minTitleLength}
					/>
				</div>
				<div className="space-y-2">
					<Label
						className="text-muted-foreground text-xs"
						htmlFor="maxTitleLength"
					>
						Max length (characters)
					</Label>
					<Input
						id="maxTitleLength"
						max={1000}
						min={10}
						onChange={(e) =>
							onChange("maxTitleLength", parseInt(e.target.value, 10) || 200)
						}
						type="number"
						value={data.maxTitleLength}
					/>
				</div>
			</div>
			{data.minTitleLength > data.maxTitleLength && (
				<p className="text-destructive text-xs">
					Min length cannot exceed max length
				</p>
			)}
		</div>
	);
}

function AbstractFields({ data, onChange }: ValidationFieldsProps) {
	return (
		<div className="space-y-3">
			<Label className="text-sm font-medium">Abstract</Label>
			<p className="text-muted-foreground -mt-2 text-xs">
				For TEXT format submissions
			</p>
			<div className="grid gap-4 sm:grid-cols-2">
				<div className="space-y-2">
					<Label
						className="text-muted-foreground text-xs"
						htmlFor="minAbstractLength"
					>
						Min length (characters)
					</Label>
					<Input
						id="minAbstractLength"
						max={10000}
						min={0}
						onChange={(e) =>
							onChange("minAbstractLength", parseInt(e.target.value, 10) || 0)
						}
						type="number"
						value={data.minAbstractLength}
					/>
				</div>
				<div className="space-y-2">
					<Label
						className="text-muted-foreground text-xs"
						htmlFor="maxAbstractLength"
					>
						Max length (characters)
					</Label>
					<Input
						id="maxAbstractLength"
						max={50000}
						min={100}
						onChange={(e) =>
							onChange(
								"maxAbstractLength",
								parseInt(e.target.value, 10) || 2000,
							)
						}
						type="number"
						value={data.maxAbstractLength}
					/>
				</div>
			</div>
			{data.minAbstractLength > data.maxAbstractLength && (
				<p className="text-destructive text-xs">
					Min length cannot exceed max length
				</p>
			)}
		</div>
	);
}

function KeywordsFields({ data, onChange }: ValidationFieldsProps) {
	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div className="space-y-0.5">
					<Label htmlFor="enableKeywords">Enable keywords</Label>
					<p className="text-muted-foreground text-sm">
						Authors can add keywords to submissions
					</p>
				</div>
				<Switch
					checked={data.enableKeywords}
					id="enableKeywords"
					onCheckedChange={(checked) => onChange("enableKeywords", checked)}
				/>
			</div>
			{data.enableKeywords && (
				<div className="grid gap-4 sm:grid-cols-2">
					<div className="space-y-2">
						<Label htmlFor="minKeywords">Min keywords</Label>
						<Input
							id="minKeywords"
							max={20}
							min={0}
							onChange={(e) =>
								onChange("minKeywords", parseInt(e.target.value, 10) || 0)
							}
							type="number"
							value={data.minKeywords}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="maxKeywords">Max keywords</Label>
						<Input
							id="maxKeywords"
							max={20}
							min={1}
							onChange={(e) =>
								onChange("maxKeywords", parseInt(e.target.value, 10) || 5)
							}
							type="number"
							value={data.maxKeywords}
						/>
					</div>
				</div>
			)}
			{data.enableKeywords && data.minKeywords > data.maxKeywords && (
				<p className="text-destructive text-xs">
					Min keywords cannot exceed max keywords
				</p>
			)}
		</div>
	);
}

interface ContentValidationSectionProps {
	data: SubmissionValidationSettings;
	onChange: SubmissionSettingsHandleChange;
}

export function ContentValidationSection({
	data,
	onChange,
}: ContentValidationSectionProps) {
	return (
		<SettingsSection
			description="Title, abstract and keyword restrictions"
			icon={IconFileText}
			title="Content Validation"
		>
			<div className="space-y-6">
				<TitleFields data={data} onChange={onChange} />
				<hr className="border-border/50" />
				<AbstractFields data={data} onChange={onChange} />
				<hr className="border-border/50" />
				<KeywordsFields data={data} onChange={onChange} />
			</div>
		</SettingsSection>
	);
}
