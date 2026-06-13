import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { FileDropzone } from "./file-dropzone";

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
				value={value}
				onChange={onChange}
				accept={accept}
				maxSize={maxSize}
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
