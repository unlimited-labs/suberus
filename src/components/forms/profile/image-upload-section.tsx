import { IconAlertCircle, IconTrash, IconUpload } from "@tabler/icons-react";
import { useCallback, useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface ImageUploadSectionProps {
	currentImageUrl: string | null;
	userInitials: string;
	onUpload: (file: File) => Promise<void>;
	onRemove: () => Promise<void>;
	isLoading?: boolean;
}

const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_SIZE_MB = 5;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

export function ImageUploadSection({
	currentImageUrl,
	userInitials,
	onUpload,
	onRemove,
	isLoading,
}: ImageUploadSectionProps) {
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const validateFile = useCallback((file: File): boolean => {
		setError(null);

		// Check file type
		if (!ACCEPTED_TYPES.includes(file.type)) {
			setError("Invalid file type. Please upload a JPG, PNG, or WebP image.");
			return false;
		}

		// Check file size
		if (file.size > MAX_SIZE_BYTES) {
			setError(`File size exceeds ${MAX_SIZE_MB}MB limit.`);
			return false;
		}

		return true;
	}, []);

	const handleFileSelect = useCallback(
		async (e: React.ChangeEvent<HTMLInputElement>) => {
			const files = e.target.files;
			if (!files || files.length === 0) return;

			const file = files[0];
			if (!validateFile(file)) return;

			// Create preview
			const reader = new FileReader();
			reader.onloadend = () => {
				setPreviewUrl(reader.result as string);
			};
			reader.readAsDataURL(file);

			// Upload
			try {
				await onUpload(file);
				setError(null);
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to upload image");
				setPreviewUrl(null);
			}

			// Reset input
			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
		},
		[onUpload, validateFile],
	);

	const handleRemove = useCallback(async () => {
		try {
			await onRemove();
			setPreviewUrl(null);
			setError(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to remove image");
		}
	}, [onRemove]);

	const triggerFileInput = () => {
		fileInputRef.current?.click();
	};

	const displayUrl = previewUrl || currentImageUrl;

	return (
		<div className="space-y-4">
			<div className="flex items-center gap-4">
				<Avatar size="lg">
					{displayUrl ? (
						<AvatarImage src={displayUrl} alt="Profile picture" />
					) : (
						<AvatarFallback>{userInitials}</AvatarFallback>
					)}
				</Avatar>

				<div className="flex flex-wrap gap-2">
					<input
						ref={fileInputRef}
						type="file"
						accept={ACCEPTED_TYPES.join(",")}
						onChange={handleFileSelect}
						className="hidden"
						aria-label="Upload profile picture"
					/>

					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={triggerFileInput}
						disabled={isLoading}
					>
						<IconUpload className="mr-2 size-4" />
						Change photo
					</Button>

					{displayUrl && (
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={handleRemove}
							disabled={isLoading}
						>
							<IconTrash className="mr-2 size-4" />
							Remove
						</Button>
					)}
				</div>
			</div>

			<p className="text-xs text-muted-foreground">
				Accepted formats: JPG, PNG, WebP. Max size: {MAX_SIZE_MB}MB.
			</p>

			{error && (
				<Alert variant="destructive">
					<IconAlertCircle className="size-4" />
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}
		</div>
	);
}
