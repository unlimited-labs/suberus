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
		<SectionCard icon={IconFileText} title="Camera-ready">
			<input
				accept=".pdf,application/pdf"
				className="hidden"
				data-testid="camera-ready-input"
				onChange={pickFile}
				ref={inputRef}
				type="file"
			/>
			{data ? (
				<div className="space-y-3">
					<a
						className="flex items-center gap-2 text-sm text-primary hover:underline"
						href={`/api/files/${data.id}`}
						rel="noreferrer"
						target="_blank"
					>
						<IconDownload className="size-4 shrink-0" />
						<span className="truncate">{data.originalName}</span>
					</a>
					<div className="flex gap-2">
						<Button
							disabled={upload.isPending}
							onClick={() => inputRef.current?.click()}
							size="sm"
							variant="outline"
						>
							<IconUpload className="mr-2 size-4" />
							Replace
						</Button>
						<Button
							disabled={remove.isPending}
							onClick={() => remove.mutate()}
							size="sm"
							variant="outline"
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
						disabled={upload.isPending}
						onClick={() => inputRef.current?.click()}
						size="sm"
						variant="outline"
					>
						<IconUpload className="mr-2 size-4" />
						{upload.isPending ? "Uploading…" : "Upload"}
					</Button>
				</div>
			)}
		</SectionCard>
	);
}
