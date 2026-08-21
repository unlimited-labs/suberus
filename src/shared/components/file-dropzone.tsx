import { IconDownload, IconFile, IconUpload, IconX } from "@tabler/icons-react";
import { type DragEvent, useState } from "react";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";

interface FileDropzoneProps {
	value?: File | null;
	onChange: (file: File | null) => void;
	/** Comma-separated `accept` attribute, e.g. ".pdf,.docx". Owner-supplied so
	 * this dropzone stays domain-agnostic. */
	accept: string;
	maxSize?: number; // in MB
	className?: string;
}

export function FileDropzone({
	value,
	onChange,
	accept,
	maxSize = 10,
	className,
}: FileDropzoneProps) {
	const [isDragging, setIsDragging] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const validateFile = (file: File): boolean => {
		setError(null);

		const sizeMB = file.size / 1024 / 1024;
		if (sizeMB > maxSize) {
			setError(`File size exceeds ${maxSize}MB limit`);
			return false;
		}

		if (accept) {
			const acceptedTypes = accept.split(",").map((t) => t.trim());
			const fileExt = `.${file.name.split(".").pop()?.toLowerCase()}`;
			if (!acceptedTypes.includes(fileExt)) {
				setError(`File type ${fileExt} not accepted`);
				return false;
			}
		}

		return true;
	};

	const handleDrop = (e: DragEvent<HTMLLabelElement>) => {
		e.preventDefault();
		setIsDragging(false);

		const files = e.dataTransfer.files;
		if (files.length > 0) {
			const file = files[0];
			if (validateFile(file)) {
				onChange(file);
			}
		}
	};

	const handleDragOver = (e: DragEvent<HTMLLabelElement>) => {
		e.preventDefault();
		setIsDragging(true);
	};

	const handleDragLeave = () => {
		setIsDragging(false);
	};

	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (files && files.length > 0) {
			const file = files[0];
			if (validateFile(file)) {
				onChange(file);
			}
		}
	};

	const handleRemove = () => {
		onChange(null);
		setError(null);
	};

	const handleDownload = () => {
		if (!value) return;
		const url = URL.createObjectURL(value);
		const a = document.createElement("a");
		a.href = url;
		a.download = value.name;
		a.click();
		URL.revokeObjectURL(url);
	};

	return (
		<div className={cn("space-y-3", className)}>
			{!value ? (
				<label
					className={cn(
						"relative block border-2 border-dashed rounded-lg transition-all duration-200 cursor-pointer",
						isDragging
							? "border-primary bg-primary/5 scale-[1.02]"
							: "border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50",
					)}
					onDragLeave={handleDragLeave}
					onDragOver={handleDragOver}
					onDrop={handleDrop}
				>
					<input
						accept={accept}
						aria-label="Upload file"
						className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
						onChange={handleFileSelect}
						type="file"
					/>
					<div className="pointer-events-none flex flex-col items-center justify-center p-8 text-center">
						<div
							className={cn(
								"mb-4 rounded-full p-4 transition-colors",
								isDragging ? "bg-primary/10" : "bg-muted",
							)}
						>
							<IconUpload
								className={cn(
									"size-8 transition-colors",
									isDragging ? "text-primary" : "text-muted-foreground",
								)}
							/>
						</div>
						<p className="text-foreground mb-1 text-sm font-medium">
							{isDragging ? "Drop file here" : "Drop file or click to upload"}
						</p>
						<p className="text-muted-foreground text-xs">
							{accept.replace(/\./g, "").toUpperCase()} up to {maxSize}MB
						</p>
					</div>
				</label>
			) : (
				<div className="border-border bg-muted/30 flex items-center gap-3 rounded-lg border p-4">
					<div className="bg-primary/10 flex-shrink-0 rounded p-2">
						<IconFile className="text-primary size-5" />
					</div>
					<div className="min-w-0 flex-1">
						<p className="text-foreground truncate text-sm font-medium">
							{value.name}
						</p>
						<p className="text-muted-foreground text-xs">
							{(value.size / 1024 / 1024).toFixed(2)} MB
						</p>
					</div>
					<Button
						aria-label="Download file"
						className="cursor-pointer"
						data-testid="download-file-button"
						onClick={handleDownload}
						size="icon-sm"
						type="button"
						variant="ghost"
					>
						<IconDownload className="size-4" />
					</Button>
					<Button
						aria-label="Remove file"
						className="cursor-pointer"
						data-testid="remove-file-button"
						onClick={handleRemove}
						size="icon-sm"
						type="button"
						variant="ghost"
					>
						<IconX className="size-4" />
					</Button>
				</div>
			)}

			{error && (
				<p className="text-destructive text-xs" role="alert">
					{error}
				</p>
			)}
		</div>
	);
}
