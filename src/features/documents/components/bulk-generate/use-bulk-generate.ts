import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
	batchProgressQueryOptions,
	documentTemplatesQueryOptions,
	previewBulkFn,
	startBulkFn,
} from "@/features/documents/api/documents";
import type { BulkPreview } from "@/features/documents/server/bulk";
import { getErrorMessage } from "@/shared/lib/error-message";

export type Step = "template" | "review" | "progress";

/** State + actions for the 3-step bulk-generate wizard. */
export function useBulkGenerate(userIds: string[], onDone?: () => void) {
	const [step, setStep] = useState<Step>("template");
	const [templateId, setTemplateId] = useState<string | null>(null);
	const [preview, setPreview] = useState<BulkPreview | null>(null);
	const [batchId, setBatchId] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	const { data: templates = [] } = useQuery(documentTemplatesQueryOptions());
	const { data: progress } = useQuery({
		...batchProgressQueryOptions(batchId),
		refetchInterval: (query) =>
			query.state.data && query.state.data.pending > 0 ? 1500 : false,
	});

	const reset = () => {
		setStep("template");
		setTemplateId(null);
		setPreview(null);
		setBatchId(null);
	};

	const review = async () => {
		if (!templateId) return;
		setBusy(true);
		try {
			setPreview(await previewBulkFn({ data: { templateId, userIds } }));
			setStep("review");
		} catch (error) {
			toast.error(getErrorMessage(error, "Failed to check participants"));
		}
		setBusy(false);
	};

	const start = async () => {
		if (!templateId) return;
		setBusy(true);
		try {
			const { batchId: id } = await startBulkFn({
				data: { templateId, userIds },
			});
			setBatchId(id);
			setStep("progress");
			onDone?.();
		} catch (error) {
			toast.error(getErrorMessage(error, "Failed to start generation"));
		}
		setBusy(false);
	};

	const done = progress ? progress.ready + progress.failed : 0;
	const pct =
		progress && progress.total > 0 ? (done / progress.total) * 100 : 0;
	const stepIndex = step === "template" ? 1 : step === "review" ? 2 : 3;

	return {
		step,
		setStep,
		templateId,
		setTemplateId,
		templates,
		preview,
		progress,
		busy,
		pct,
		stepIndex,
		reset,
		review,
		start,
	};
}
