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
				onValueChange={(value) => {
					const found = CONTENT_FORMATS.find((f) => f === value);
					if (found) onChange("contentFormat", found);
				}}
				value={config.contentFormat}
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
						className="flex flex-wrap gap-3"
						onValueChange={(value) =>
							// SAFETY: the select renders only supported extensions.
							onSelectExtension(value as SupportedFileExtension)
						}
						value={config.allowedExtensions[0] ?? ""}
					>
						{SUPPORTED_FILE_EXTENSIONS.map((ext) => (
							<div className="flex items-center gap-2" key={ext}>
								<RadioGroupItem id={`ext-${ext}`} value={ext} />
								<Label
									className="text-sm uppercase cursor-pointer"
									htmlFor={`ext-${ext}`}
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
							className="text-sm"
							htmlFor={`max-file-size-${config.contentFormat}`}
						>
							Max file size (MB)
						</Label>
						<Input
							className="max-w-32"
							id={`max-file-size-${config.contentFormat}`}
							max={100}
							min={1}
							onChange={(e) =>
								onChange("maxFileSizeMb", parseInt(e.target.value, 10) || 10)
							}
							type="number"
							value={config.maxFileSizeMb}
						/>
					</div>
				</div>
			)}
		</div>
	);
}
