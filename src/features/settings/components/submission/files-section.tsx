import { IconUpload } from "@tabler/icons-react";
import type { SubmissionValidationSettings } from "@/features/settings/api/settings";
import { SettingsSection } from "@/features/settings/components/settings-section";
import { FILE_TYPE_OPTIONS } from "@/features/settings/file-types";
import { Checkbox } from "@/shared/ui/checkbox";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import type { SubmissionSettingsHandleChange } from "./use-submission-settings";

interface FilesSectionProps {
	data: SubmissionValidationSettings;
	onChange: SubmissionSettingsHandleChange;
	onToggleFileType: (type: string) => void;
}

export function FilesSection({
	data,
	onChange,
	onToggleFileType,
}: FilesSectionProps) {
	return (
		<SettingsSection
			icon={IconUpload}
			title="Files"
			description="Uploaded file settings"
			delay={50}
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
							onChange("maxFileSize", parseInt(e.target.value, 10) || 10)
						}
						className="max-w-32"
					/>
				</div>
				<div className="space-y-2">
					<Label>Allowed file types</Label>
					<div className="flex flex-wrap gap-4">
						{FILE_TYPE_OPTIONS.map((type) => (
							<Label
								key={type.value}
								className="flex cursor-pointer items-center gap-2 font-normal"
							>
								<Checkbox
									checked={data.allowedFileTypes.includes(type.value)}
									onCheckedChange={() => onToggleFileType(type.value)}
								/>
								<span className="text-sm">{type.label}</span>
							</Label>
						))}
					</div>
				</div>
			</div>
		</SettingsSection>
	);
}
