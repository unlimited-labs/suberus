import { IconAlertTriangle, IconUsers } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
	batchProgressQueryOptions,
	documentTemplatesQueryOptions,
	previewBulkFn,
	startBulkFn,
} from "@/features/documents/api/documents";
import {
	NoTemplatesHint,
	placeholderLabel,
} from "@/features/documents/components/document-bits";
import type { BulkPreview } from "@/features/documents/server/bulk";
import { getErrorMessage } from "@/shared/lib/error-message";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/shared/ui/dialog";
import { Label } from "@/shared/ui/label";
import { Progress } from "@/shared/ui/progress";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/ui/select";

interface BulkGenerateDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Participants selected in the Users list. */
	userIds: string[];
	onDone?: () => void;
}

type Step = "template" | "review" | "progress";

export function BulkGenerateDialog({
	open,
	onOpenChange,
	userIds,
	onDone,
}: BulkGenerateDialogProps) {
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

	const handleReview = async () => {
		if (!templateId) return;
		setBusy(true);
		try {
			const result = await previewBulkFn({ data: { templateId, userIds } });
			setPreview(result);
			setStep("review");
		} catch (error) {
			toast.error(getErrorMessage(error, "Failed to check participants"));
		} finally {
			setBusy(false);
		}
	};

	const handleStart = async () => {
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
		} finally {
			setBusy(false);
		}
	};

	const done = progress ? progress.ready + progress.failed : 0;
	const pct =
		progress && progress.total > 0 ? (done / progress.total) * 100 : 0;

	return (
		<Dialog
			open={open}
			onOpenChange={(o) => {
				if (busy) return;
				if (!o) reset();
				onOpenChange(o);
			}}
		>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>Generate documents</DialogTitle>
					<DialogDescription>
						{step === "template" &&
							`Choose a template for the ${userIds.length} selected participant${userIds.length === 1 ? "" : "s"}.`}
						{step === "review" && "Review who can be generated."}
						{step === "progress" && "Generating documents…"}
					</DialogDescription>
					<p className="text-xs font-medium text-muted-foreground">
						Step {step === "template" ? 1 : step === "review" ? 2 : 3} of 3
					</p>
				</DialogHeader>

				{step === "template" && (
					<div className="space-y-2 py-2">
						<Label>Template</Label>
						<Select
							value={templateId ?? undefined}
							onValueChange={setTemplateId}
						>
							<SelectTrigger data-testid="bulk-template-select">
								<SelectValue placeholder="Select a template…" />
							</SelectTrigger>
							<SelectContent>
								{templates.map((t) => (
									<SelectItem key={t.id} value={t.id}>
										{t.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{templates.length === 0 && <NoTemplatesHint />}
					</div>
				)}

				{step === "review" && preview && (
					<div className="space-y-3 py-1">
						<div className="flex items-center gap-2 rounded-md border bg-muted/40 p-3">
							<IconUsers className="size-5 text-primary" />
							<p className="text-sm">
								<span className="font-semibold">
									{preview.resolvableIds.length}
								</span>{" "}
								will be generated
								{preview.skipped.length > 0 && (
									<>
										,{" "}
										<span className="font-semibold text-amber-600">
											{preview.skipped.length}
										</span>{" "}
										skipped
									</>
								)}
								.
							</p>
						</div>
						{preview.skipped.length > 0 && (
							<div className="max-h-56 overflow-auto rounded-md border border-amber-200 bg-amber-50/60 p-2 dark:border-amber-900/40 dark:bg-amber-950/20">
								<div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
									<IconAlertTriangle className="size-3.5" />
									Skipped — missing data
								</div>
								{preview.skipped.map((s) => (
									<div
										key={s.userId}
										className="flex items-center justify-between gap-2 px-1 py-1 text-xs"
									>
										<span className="truncate">{s.name}</span>
										<span className="shrink-0 text-muted-foreground">
											{s.missing.map(placeholderLabel).join(", ")}
										</span>
									</div>
								))}
							</div>
						)}
					</div>
				)}

				{step === "progress" && progress && (
					<div className="space-y-3 py-1" aria-live="polite">
						<Progress value={pct} />
						<div className="flex flex-wrap items-center gap-2 text-sm">
							<Badge variant="default">{progress.ready} ready</Badge>
							<Badge variant="secondary">{progress.pending} pending</Badge>
							{progress.failed > 0 && (
								<Badge variant="destructive">{progress.failed} failed</Badge>
							)}
							<span className="text-muted-foreground">of {progress.total}</span>
						</div>
						{progress.failures.length > 0 && (
							<div className="max-h-48 overflow-auto rounded-md border border-destructive/30 p-2">
								{progress.failures.map((f) => (
									<div
										key={f.id}
										className="flex items-center justify-between gap-2 px-1 py-1 text-xs"
									>
										<span className="truncate">{f.participant}</span>
										<span className="shrink-0 text-destructive">
											{f.error ?? "Failed"}
										</span>
									</div>
								))}
							</div>
						)}
					</div>
				)}

				<DialogFooter>
					{step === "template" && (
						<Button
							onClick={handleReview}
							disabled={busy || !templateId}
							data-testid="bulk-review-button"
						>
							Review
						</Button>
					)}
					{step === "review" && (
						<>
							<Button
								variant="outline"
								onClick={() => setStep("template")}
								disabled={busy}
							>
								Back
							</Button>
							<Button
								onClick={handleStart}
								disabled={
									busy || !preview || preview.resolvableIds.length === 0
								}
								data-testid="bulk-generate-button"
							>
								Generate {preview?.resolvableIds.length ?? 0}
							</Button>
						</>
					)}
					{step === "progress" && (
						<Button onClick={() => onOpenChange(false)}>Close</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
