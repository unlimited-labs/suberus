import { FileDropzone } from "@/shared/components/file-dropzone";
import { Field, FieldDescription, FieldLabel } from "@/shared/ui/field";

interface FileUploadSectionProps {
	value: File | null;
	onChange: (file: File | null) => void;
	accept: string;
	maxSize: number;
	allowedExtensions: string[];
}

export function FileUploadSection({
	value,
	onChange,
	accept,
	maxSize,
	allowedExtensions,
}: FileUploadSectionProps) {
	return (
		<Field>
			<FieldLabel>
				Document <span className="text-destructive text-xs font-normal">*</span>
			</FieldLabel>
			<FileDropzone
				accept={accept}
				maxSize={maxSize}
				onChange={onChange}
				value={value}
			/>
			{!value && (
				<FieldDescription>
					Accepted formats:{" "}
					{allowedExtensions.map((e) => e.toUpperCase()).join(", ")}
				</FieldDescription>
			)}
		</Field>
	);
}
