import { useState, useCallback, type DragEvent } from "react"
import { IconUpload, IconFile, IconX } from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface FileDropzoneProps {
	value?: File | null
	onChange: (file: File | null) => void
	accept?: string
	maxSize?: number // in MB
	className?: string
}

export function FileDropzone({
	value,
	onChange,
	accept = ".pdf,.doc,.docx",
	maxSize = 10,
	className,
}: FileDropzoneProps) {
	const [isDragging, setIsDragging] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const validateFile = useCallback(
		(file: File): boolean => {
			setError(null)

			// Check file size
			const sizeMB = file.size / 1024 / 1024
			if (sizeMB > maxSize) {
				setError(`File size exceeds ${maxSize}MB limit`)
				return false
			}

			// Check file type
			if (accept) {
				const acceptedTypes = accept.split(",").map((t) => t.trim())
				const fileExt = `.${file.name.split(".").pop()?.toLowerCase()}`
				if (!acceptedTypes.includes(fileExt)) {
					setError(`File type ${fileExt} not accepted`)
					return false
				}
			}

			return true
		},
		[accept, maxSize]
	)

	const handleDrop = useCallback(
		(e: DragEvent<HTMLDivElement>) => {
			e.preventDefault()
			setIsDragging(false)

			const files = e.dataTransfer.files
			if (files.length > 0) {
				const file = files[0]
				if (validateFile(file)) {
					onChange(file)
				}
			}
		},
		[onChange, validateFile]
	)

	const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
		e.preventDefault()
		setIsDragging(true)
	}, [])

	const handleDragLeave = useCallback(() => {
		setIsDragging(false)
	}, [])

	const handleFileSelect = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const files = e.target.files
			if (files && files.length > 0) {
				const file = files[0]
				if (validateFile(file)) {
					onChange(file)
				}
			}
		},
		[onChange, validateFile]
	)

	const handleRemove = useCallback(() => {
		onChange(null)
		setError(null)
	}, [onChange])

	return (
		<div className={cn("space-y-3", className)}>
			{!value ? (
				<label
					onDrop={handleDrop}
					onDragOver={handleDragOver}
					onDragLeave={handleDragLeave}
					className={cn(
						"relative block border-2 border-dashed rounded-lg transition-all duration-200 cursor-pointer",
						isDragging
							? "border-primary bg-primary/5 scale-[1.02]"
							: "border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50"
					)}
				>
					<input
						type="file"
						accept={accept}
						onChange={handleFileSelect}
						className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
						aria-label="Upload file"
					/>
					<div className="flex flex-col items-center justify-center p-8 text-center pointer-events-none">
						<div
							className={cn(
								"mb-4 rounded-full p-4 transition-colors",
								isDragging ? "bg-primary/10" : "bg-muted"
							)}
						>
							<IconUpload
								className={cn(
									"size-8 transition-colors",
									isDragging ? "text-primary" : "text-muted-foreground"
								)}
							/>
						</div>
						<p className="text-sm font-medium text-foreground mb-1">
							{isDragging ? "Drop file here" : "Drop file or click to upload"}
						</p>
						<p className="text-xs text-muted-foreground">
							{accept.replace(/\./g, "").toUpperCase()} up to {maxSize}MB
						</p>
					</div>
				</label>
			) : (
				<div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-muted/30">
					<div className="flex-shrink-0 p-2 rounded bg-primary/10">
						<IconFile className="size-5 text-primary" />
					</div>
					<div className="flex-1 min-w-0">
						<p className="text-sm font-medium text-foreground truncate">
							{value.name}
						</p>
						<p className="text-xs text-muted-foreground">
							{(value.size / 1024 / 1024).toFixed(2)} MB
						</p>
					</div>
					<Button
						type="button"
						size="icon-sm"
						variant="ghost"
						onClick={handleRemove}
						aria-label="Remove file"
					>
						<IconX className="size-4" />
					</Button>
				</div>
			)}

			{error && (
				<p className="text-xs text-destructive" role="alert">
					{error}
				</p>
			)}
		</div>
	)
}
