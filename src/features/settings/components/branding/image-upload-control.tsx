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

/** Upload/replace + remove buttons for a branding image. Preview is rendered by the caller. */
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
				ref={inputRef}
				type="file"
				accept={ACCEPTED_IMAGE_TYPES.join(",")}
				onChange={onUpload}
				className="hidden"
				aria-label={ariaLabel}
			/>
			<Button
				variant="outline"
				size="sm"
				onClick={() => inputRef.current?.click()}
				disabled={uploading || removing}
				data-testid={`${testIdPrefix}-upload`}
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
					variant="ghost"
					size="sm"
					onClick={onRemove}
					disabled={uploading || removing}
					data-testid={`${testIdPrefix}-remove`}
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
