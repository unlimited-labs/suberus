import {
	SUPPORTED_FILE_EXTENSIONS,
	type SupportedFileExtension,
} from "@/features/settings/file-types";
import type {
	ContentFormat,
	SubmissionTypeConfig,
} from "@/features/settings/types";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/radio-group";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/ui/select";
import type { SubmissionTypeConfigHandleChange } from "./use-submission-type-config";

const CONTENT_FORMATS = [
	"TEXT",
	"FILE",
] as const satisfies readonly ContentFormat[];

interface TypeFormatSectionProps {
	config: SubmissionTypeConfig;
	onChange: SubmissionTypeConfigHandleChange;
	onSelectExtension: (ext: SupportedFileExtension) => void;
}

export function TypeFormatSection({
	config,
	onChange,
	onSelectExtension,
}: TypeFormatSectionProps) {
	return (
		<div className="space-y-3">
			<div className="space-y-0.5">
				<Label>Content Format</Label>
				<p className="text-xs italic text-muted-foreground/70">
					How authors provide their submission content
				</p>
			</div>
			<Select
				items={[
					{ value: "TEXT", label: "Text (Abstract)" },
					{ value: "FILE", label: "File Upload" },
				]}
				value={config.contentFormat}
				onValueChange={(value) => {
					const found = CONTENT_FORMATS.find((f) => f === value);
					if (found) onChange("contentFormat", found);
				}}
			>
				<SelectTrigger className="max-w-64">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="TEXT">Text (Abstract)</SelectItem>
					<SelectItem value="FILE">File Upload</SelectItem>
				</SelectContent>
			</Select>

			{/* File extensions (only for FILE format) */}
			{config.contentFormat === "FILE" && (
				<div className="space-y-2 pl-0 sm:pl-4 pt-2">
					<Label className="text-sm">Allowed file extension</Label>
					<RadioGroup
						value={config.allowedExtensions[0] ?? ""}
						onValueChange={(value) =>
							onSelectExtension(value as SupportedFileExtension)
						}
						className="flex flex-wrap gap-3"
					>
						{SUPPORTED_FILE_EXTENSIONS.map((ext) => (
							<div key={ext} className="flex items-center gap-2">
								<RadioGroupItem id={`ext-${ext}`} value={ext} />
								<Label
									htmlFor={`ext-${ext}`}
									className="text-sm uppercase cursor-pointer"
								>
									{ext}
								</Label>
							</div>
						))}
					</RadioGroup>
					{config.allowedExtensions.length === 0 && (
						<p className="text-xs text-destructive">
							Select an allowed file extension
						</p>
					)}

					<div className="space-y-2 pt-2">
						<Label
							htmlFor={`max-file-size-${config.contentFormat}`}
							className="text-sm"
						>
							Max file size (MB)
						</Label>
						<Input
							id={`max-file-size-${config.contentFormat}`}
							type="number"
							min={1}
							max={100}
							value={config.maxFileSizeMb}
							onChange={(e) =>
								onChange("maxFileSizeMb", parseInt(e.target.value, 10) || 10)
							}
							className="max-w-32"
						/>
					</div>
				</div>
			)}
		</div>
	);
}
