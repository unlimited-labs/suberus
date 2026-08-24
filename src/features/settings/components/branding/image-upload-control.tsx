import { IconLoader2, IconTrash, IconUpload } from "@tabler/icons-react";
import { Button } from "@/shared/ui/button";
import {
	ACCEPTED_IMAGE_TYPES,
	type ImageUpload,
} from "./use-branding-settings";

interface ImageUploadControlProps {
	upload: ImageUpload;
	hasImage: boolean;
	/** Prefix for upload/remove test ids, e.g. "auth-background" → "auth-background-upload". */
	testIdPrefix: string;
	ariaLabel: string;
}

export function ImageUploadControl({
	upload,
	hasImage,
	testIdPrefix,
	ariaLabel,
}: ImageUploadControlProps) {
	const { uploading, removing, inputRef, onUpload, onRemove } = upload;
	return (
		<div className="flex flex-wrap gap-2">
			<input
				accept={ACCEPTED_IMAGE_TYPES.join(",")}
				aria-label={ariaLabel}
				className="hidden"
				onChange={onUpload}
				ref={inputRef}
				type="file"
			/>
			<Button
				data-testid={`${testIdPrefix}-upload`}
				disabled={uploading || removing}
				onClick={() => inputRef.current?.click()}
				size="sm"
				type="button"
				variant="outline"
			>
				{uploading ? (
					<IconLoader2 className="mr-2 size-4 animate-spin" />
				) : (
					<IconUpload className="mr-2 size-4" />
				)}
				{hasImage ? "Replace image" : "Upload image"}
			</Button>
			{hasImage && (
				<Button
					data-testid={`${testIdPrefix}-remove`}
					disabled={uploading || removing}
					onClick={onRemove}
					size="sm"
					type="button"
					variant="ghost"
				>
					{removing ? (
						<IconLoader2 className="mr-2 size-4 animate-spin" />
					) : (
						<IconTrash className="mr-2 size-4" />
					)}
					Remove
				</Button>
			)}
		</div>
	);
}
