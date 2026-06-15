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
						htmlFor="minTitleLength"
						className="text-xs text-muted-foreground"
					>
						Min length (characters)
					</Label>
					<Input
						id="minTitleLength"
						type="number"
						min={1}
						max={500}
						value={data.minTitleLength}
						onChange={(e) =>
							onChange("minTitleLength", parseInt(e.target.value, 10) || 1)
						}
					/>
				</div>
				<div className="space-y-2">
					<Label
						htmlFor="maxTitleLength"
						className="text-xs text-muted-foreground"
					>
						Max length (characters)
					</Label>
					<Input
						id="maxTitleLength"
						type="number"
						min={10}
						max={1000}
						value={data.maxTitleLength}
						onChange={(e) =>
							onChange("maxTitleLength", parseInt(e.target.value, 10) || 200)
						}
					/>
				</div>
			</div>
			{data.minTitleLength > data.maxTitleLength && (
				<p className="text-xs text-destructive">
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
			<p className="text-xs text-muted-foreground -mt-2">
				For TEXT format submissions
			</p>
			<div className="grid gap-4 sm:grid-cols-2">
				<div className="space-y-2">
					<Label
						htmlFor="minAbstractLength"
						className="text-xs text-muted-foreground"
					>
						Min length (characters)
					</Label>
					<Input
						id="minAbstractLength"
						type="number"
						min={0}
						max={10000}
						value={data.minAbstractLength}
						onChange={(e) =>
							onChange("minAbstractLength", parseInt(e.target.value, 10) || 0)
						}
					/>
				</div>
				<div className="space-y-2">
					<Label
						htmlFor="maxAbstractLength"
						className="text-xs text-muted-foreground"
					>
						Max length (characters)
					</Label>
					<Input
						id="maxAbstractLength"
						type="number"
						min={100}
						max={50000}
						value={data.maxAbstractLength}
						onChange={(e) =>
							onChange(
								"maxAbstractLength",
								parseInt(e.target.value, 10) || 2000,
							)
						}
					/>
				</div>
			</div>
			{data.minAbstractLength > data.maxAbstractLength && (
				<p className="text-xs text-destructive">
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
					<p className="text-sm text-muted-foreground">
						Authors can add keywords to submissions
					</p>
				</div>
				<Switch
					id="enableKeywords"
					checked={data.enableKeywords}
					onCheckedChange={(checked) => onChange("enableKeywords", checked)}
				/>
			</div>
			{data.enableKeywords && (
				<div className="grid gap-4 sm:grid-cols-2">
					<div className="space-y-2">
						<Label htmlFor="minKeywords">Min keywords</Label>
						<Input
							id="minKeywords"
							type="number"
							min={0}
							max={20}
							value={data.minKeywords}
							onChange={(e) =>
								onChange("minKeywords", parseInt(e.target.value, 10) || 0)
							}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="maxKeywords">Max keywords</Label>
						<Input
							id="maxKeywords"
							type="number"
							min={1}
							max={20}
							value={data.maxKeywords}
							onChange={(e) =>
								onChange("maxKeywords", parseInt(e.target.value, 10) || 5)
							}
						/>
					</div>
				</div>
			)}
			{data.enableKeywords && data.minKeywords > data.maxKeywords && (
				<p className="text-xs text-destructive">
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
			icon={IconFileText}
			title="Content Validation"
			description="Title, abstract and keyword restrictions"
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
