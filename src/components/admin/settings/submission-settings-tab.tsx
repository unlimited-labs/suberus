import {
	IconFileText,
	IconLoader2,
	IconSettings,
	IconTags,
	IconUpload,
} from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";
import { SettingsSection } from "@/components/settings/settings-section";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { SubmissionValidationSettings } from "@/utils/settings.functions";
import { updateSubmissionValidationSettingsFn } from "@/utils/settings.functions";

interface SubmissionSettingsTabProps {
	initialData: SubmissionValidationSettings;
}

const fileTypeOptions = [
	{ value: "pdf", label: "PDF" },
	{ value: "docx", label: "DOCX" },
	{ value: "doc", label: "DOC" },
	{ value: "txt", label: "TXT" },
	{ value: "rtf", label: "RTF" },
];

export function SubmissionSettingsTab({
	initialData,
}: SubmissionSettingsTabProps) {
	const [data, setData] = useState(initialData);
	const [isSaving, setIsSaving] = useState(false);

	const handleChange = <K extends keyof SubmissionValidationSettings>(
		field: K,
		value: SubmissionValidationSettings[K],
	) => {
		setData((prev) => ({ ...prev, [field]: value }));
	};

	const toggleFileType = (type: string) => {
		setData((prev) => ({
			...prev,
			allowedFileTypes: prev.allowedFileTypes.includes(type)
				? prev.allowedFileTypes.filter((t) => t !== type)
				: [...prev.allowedFileTypes, type],
		}));
	};

	const handleSave = async () => {
		setIsSaving(true);
		try {
			await updateSubmissionValidationSettingsFn({ data });
			toast.success("Submission settings saved");
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to save settings",
			);
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div className="space-y-6">
			<SettingsSection
				icon={IconFileText}
				title="Title"
				description="Title length restrictions"
			>
				<div className="grid gap-4 sm:grid-cols-2">
					<div className="space-y-2">
						<Label htmlFor="minTitleLength">Min length (characters)</Label>
						<Input
							id="minTitleLength"
							type="number"
							min={1}
							max={500}
							value={data.minTitleLength}
							onChange={(e) =>
								handleChange(
									"minTitleLength",
									parseInt(e.target.value, 10) || 1,
								)
							}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="maxTitleLength">Max length (characters)</Label>
						<Input
							id="maxTitleLength"
							type="number"
							min={10}
							max={1000}
							value={data.maxTitleLength}
							onChange={(e) =>
								handleChange(
									"maxTitleLength",
									parseInt(e.target.value, 10) || 200,
								)
							}
						/>
					</div>
				</div>
				{data.minTitleLength > data.maxTitleLength && (
					<p className="text-xs text-destructive mt-2">
						Min length cannot exceed max length
					</p>
				)}
			</SettingsSection>

			<SettingsSection
				icon={IconFileText}
				title="Abstract"
				description="Abstract length restrictions (for TEXT format submissions)"
				delay={50}
			>
				<div className="grid gap-4 sm:grid-cols-2">
					<div className="space-y-2">
						<Label htmlFor="minAbstractLength">Min length (characters)</Label>
						<Input
							id="minAbstractLength"
							type="number"
							min={0}
							max={10000}
							value={data.minAbstractLength}
							onChange={(e) =>
								handleChange(
									"minAbstractLength",
									parseInt(e.target.value, 10) || 0,
								)
							}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="maxAbstractLength">Max length (characters)</Label>
						<Input
							id="maxAbstractLength"
							type="number"
							min={100}
							max={50000}
							value={data.maxAbstractLength}
							onChange={(e) =>
								handleChange(
									"maxAbstractLength",
									parseInt(e.target.value, 10) || 2000,
								)
							}
						/>
					</div>
				</div>
				{data.minAbstractLength > data.maxAbstractLength && (
					<p className="text-xs text-destructive mt-2">
						Min length cannot exceed max length
					</p>
				)}
			</SettingsSection>

			<SettingsSection
				icon={IconTags}
				title="Keywords"
				description="Keyword requirements"
				delay={100}
			>
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
							onCheckedChange={(checked) =>
								handleChange("enableKeywords", checked)
							}
						/>
					</div>
					{data.enableKeywords && (
						<div className="grid gap-4 sm:grid-cols-2 pl-0 sm:pl-4">
							<div className="space-y-2">
								<Label htmlFor="minKeywords">Min keywords</Label>
								<Input
									id="minKeywords"
									type="number"
									min={0}
									max={20}
									value={data.minKeywords}
									onChange={(e) =>
										handleChange(
											"minKeywords",
											parseInt(e.target.value, 10) || 0,
										)
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
										handleChange(
											"maxKeywords",
											parseInt(e.target.value, 10) || 5,
										)
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
			</SettingsSection>

			<SettingsSection
				icon={IconUpload}
				title="Files"
				description="Uploaded file settings"
				delay={150}
			>
				<div className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="maxFileSize">Max file size (MB)</Label>
						<Input
							id="maxFileSize"
							type="number"
							min={1}
							max={100}
							value={data.maxFileSize}
							onChange={(e) =>
								handleChange("maxFileSize", parseInt(e.target.value, 10) || 10)
							}
							className="max-w-32"
						/>
					</div>
					<div className="space-y-2">
						<Label>Allowed file types</Label>
						<div className="flex flex-wrap gap-4">
							{fileTypeOptions.map((type) => (
								<Label
									key={type.value}
									className="flex cursor-pointer items-center gap-2 font-normal"
								>
									<Checkbox
										checked={data.allowedFileTypes.includes(type.value)}
										onCheckedChange={() => toggleFileType(type.value)}
									/>
									<span className="text-sm">{type.label}</span>
								</Label>
							))}
						</div>
					</div>
				</div>
			</SettingsSection>

			<SettingsSection
				icon={IconSettings}
				title="Other Options"
				description="Additional submission options"
				delay={200}
			>
				<div className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="maxAuthors">Max number of authors</Label>
						<Input
							id="maxAuthors"
							type="number"
							min={1}
							max={50}
							value={data.maxAuthors}
							onChange={(e) =>
								handleChange("maxAuthors", parseInt(e.target.value, 10) || 10)
							}
							className="max-w-32"
						/>
					</div>
					<div className="flex items-center justify-between">
						<div className="space-y-0.5">
							<Label htmlFor="requireOrcid">Require ORCID</Label>
							<p className="text-sm text-muted-foreground">
								Authors must provide an ORCID identifier
							</p>
						</div>
						<Switch
							id="requireOrcid"
							checked={data.requireOrcid}
							onCheckedChange={(checked) =>
								handleChange("requireOrcid", checked)
							}
						/>
					</div>
				</div>
			</SettingsSection>

			<div className="flex justify-end border-t pt-6">
				<Button onClick={handleSave} disabled={isSaving}>
					{isSaving && <IconLoader2 className="mr-2 size-4 animate-spin" />}
					Save All Settings
				</Button>
			</div>
		</div>
	);
}
