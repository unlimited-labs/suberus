import {
	IconDownload,
	IconFileText,
	IconTrash,
	IconUpload,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { toast } from "sonner";
import {
	cameraReadyQueryOptions,
	deleteCameraReadyFn,
	uploadCameraReadyFn,
} from "@/features/submissions/api/camera-ready";
import { Button } from "@/shared/ui/button";
import { SectionCard } from "@/shared/ui/section-card";

export function CameraReadyCard({ submissionId }: { submissionId: string }) {
	const queryClient = useQueryClient();
	const options = cameraReadyQueryOptions(submissionId);
	const { data } = useQuery(options);
	const inputRef = useRef<HTMLInputElement>(null);
	const invalidate = () =>
		queryClient.invalidateQueries({ queryKey: options.queryKey });

	const upload = useMutation({
		mutationFn: (file: File) => {
			const formData = new FormData();
			formData.append("submissionId", submissionId);
			formData.append("file", file);
			return uploadCameraReadyFn({ data: formData });
		},
		onSuccess: (result) => {
			if (result.success) {
				toast.success("Camera-ready uploaded");
				invalidate();
			} else {
				toast.error(result.error);
			}
		},
		onError: () => toast.error("Upload failed"),
	});

	const remove = useMutation({
		mutationFn: () => deleteCameraReadyFn({ data: { submissionId } }),
		onSuccess: () => {
			toast.success("Camera-ready removed");
			invalidate();
		},
		onError: () => toast.error("Remove failed"),
	});

	const pickFile = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (file) upload.mutate(file);
		event.target.value = "";
	};

	return (
		<SectionCard title="Camera-ready" icon={IconFileText}>
			<input
				ref={inputRef}
				type="file"
				accept=".pdf,application/pdf"
				className="hidden"
				data-testid="camera-ready-input"
				onChange={pickFile}
			/>
			{data ? (
				<div className="space-y-3">
					<a
						href={`/api/files/${data.id}`}
						target="_blank"
						rel="noreferrer"
						className="flex items-center gap-2 text-sm text-primary hover:underline"
					>
						<IconDownload className="size-4 shrink-0" />
						<span className="truncate">{data.originalName}</span>
					</a>
					<div className="flex gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => inputRef.current?.click()}
							disabled={upload.isPending}
						>
							<IconUpload className="mr-2 size-4" />
							Replace
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() => remove.mutate()}
							disabled={remove.isPending}
						>
							<IconTrash className="mr-2 size-4" />
							Remove
						</Button>
					</div>
				</div>
			) : (
				<div className="space-y-3">
					<p className="text-sm text-muted-foreground">
						No camera-ready file. Upload a branded PDF to make it the public
						download on the program.
					</p>
					<Button
						variant="outline"
						size="sm"
						onClick={() => inputRef.current?.click()}
						disabled={upload.isPending}
					>
						<IconUpload className="mr-2 size-4" />
						{upload.isPending ? "Uploading…" : "Upload"}
					</Button>
				</div>
			)}
		</SectionCard>
	);
}
