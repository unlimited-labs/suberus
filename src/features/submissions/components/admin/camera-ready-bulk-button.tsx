import { IconUpload } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { adminSubmissionsQueryOptions } from "@/features/submissions/api/admin-submissions";
import { uploadCameraReadyBulkFn } from "@/features/submissions/api/camera-ready";
import type { BulkSkip } from "@/features/submissions/server/camera-ready";
import { Button } from "@/shared/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";

const SKIP_REASON_LABEL = {
	"no-number": "no leading number",
	"not-found": "no matching submission",
	"not-pdf": "not a PDF",
	"too-large": "exceeds 25MB",
} satisfies Record<BulkSkip["reason"], string>;

export function CameraReadyBulkUploadButton() {
	const queryClient = useQueryClient();
	const [open, setOpen] = useState(false);
	const [file, setFile] = useState<File | null>(null);

	const mutation = useMutation({
		mutationFn: (zip: File) => {
			const formData = new FormData();
			formData.append("file", zip);
			return uploadCameraReadyBulkFn({ data: formData });
		},
		onSuccess: (result) => {
			toast.success(
				`${result.uploaded} camera-ready file(s) uploaded` +
					(result.skipped.length ? `, ${result.skipped.length} skipped` : ""),
			);
			for (const skip of result.skipped) {
				toast.warning(
					`Skipped ${skip.name}: ${SKIP_REASON_LABEL[skip.reason]}`,
				);
			}
			void queryClient.invalidateQueries({
				queryKey: adminSubmissionsQueryOptions().queryKey,
			});
			setOpen(false);
			setFile(null);
		},
		onError: () => toast.error("Bulk upload failed"),
	});

	return (
		<Dialog onOpenChange={setOpen} open={open}>
			<DialogTrigger asChild>
				<Button size="sm" variant="outline">
					<IconUpload className="mr-2 size-4" />
					Upload camera-ready
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Upload camera-ready files</DialogTitle>
					<DialogDescription>
						Upload a ZIP of branded PDFs. Each file is matched to a submission
						by its leading number (the same numbering as the export). A
						re-upload replaces the previous camera-ready.
					</DialogDescription>
				</DialogHeader>
				<Input
					accept=".zip,application/zip"
					data-testid="camera-ready-bulk-input"
					onChange={(e) => setFile(e.target.files?.[0] ?? null)}
					type="file"
				/>
				<DialogFooter>
					<Button
						disabled={!file || mutation.isPending}
						onClick={() => file && mutation.mutate(file)}
					>
						{mutation.isPending ? "Uploading…" : "Upload"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
