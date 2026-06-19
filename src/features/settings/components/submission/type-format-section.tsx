import {
	SUPPORTED_FILE_EXTENSIONS,
	type SupportedFileExtension,
} from "@/features/settings/file-types";
import type {
	ContentFormat,
	SubmissionTypeConfig,
} from "@/features/settings/types";
import { Checkbox } from "@/shared/ui/checkbox";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
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
	onToggleExtension: (ext: SupportedFileExtension) => void;
}

export function TypeFormatSection({
	config,
	onChange,
	onToggleExtension,
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
					<Label className="text-sm">Allowed file extensions</Label>
					<div className="flex flex-wrap gap-3">
						{SUPPORTED_FILE_EXTENSIONS.map((ext) => (
							<div key={ext} className="flex items-center gap-2 cursor-pointer">
								<Checkbox
									id={`ext-${ext}`}
									checked={config.allowedExtensions.includes(ext)}
									onCheckedChange={() => onToggleExtension(ext)}
								/>
								<Label
									htmlFor={`ext-${ext}`}
									className="text-sm uppercase cursor-pointer"
								>
									{ext}
								</Label>
							</div>
						))}
					</div>
					{config.allowedExtensions.length === 0 && (
						<p className="text-xs text-destructive">
							At least one extension is required
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
