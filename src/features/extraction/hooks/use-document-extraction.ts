import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
	enqueueExtractionFn,
	getExtractionResultFn,
} from "@/features/extraction/api/extraction";
import { SUPPORTED_FILE_EXTENSIONS_DOTTED } from "@/features/settings/file-types";
import { useJobSSE } from "@/shared/hooks/use-job-sse";
import type { Author } from "@/shared/types/author";

interface UseDocumentExtractionOptions {
	enabled: boolean;
	skipExtraction: boolean;
	onExtracted: (data: {
		title?: string;
		authors?: Author[];
		keywords?: string[];
	}) => void;
}

interface UseDocumentExtractionReturn {
	isExtracting: boolean;
	elapsedSeconds: number;
	stage: string;
	progress: { current: number; total: number };
	handleFileChange: (
		file: File | null,
		fieldHandleChange: (file: File | null) => void,
	) => void;
}

function mapToFormAuthors(
	authors: {
		firstName: string;
		lastName: string;
		email?: string;
		affiliationName?: string;
	}[],
): Author[] {
	return authors.map((a, i) => ({
		firstName: a.firstName,
		lastName: a.lastName,
		email: a.email ?? "",
		affiliationId: null,
		affiliationName: a.affiliationName ?? "",
		isPresenter: i === 0,
	}));
}

export function useDocumentExtraction({
	enabled,
	skipExtraction,
	onExtracted,
}: UseDocumentExtractionOptions): UseDocumentExtractionReturn {
	const [isExtracting, setIsExtracting] = useState(false);
	const [elapsedSeconds, setElapsedSeconds] = useState(0);
	const [jobId, setJobId] = useState<string | null>(null);
	const abortRef = useRef<AbortController | null>(null);
	const handledJobRef = useRef<string | null>(null);

	// Stable ref for callback — updated via effect, not during render
	const onExtractedRef = useRef(onExtracted);
	useEffect(() => {
		onExtractedRef.current = onExtracted;
	}, [onExtracted]);

	const sseState = useJobSSE(jobId);

	// Elapsed timer
	useEffect(() => {
		if (!isExtracting) return;
		const interval = setInterval(() => {
			setElapsedSeconds((prev) => prev + 1);
		}, 1000);
		return () => clearInterval(interval);
	}, [isExtracting]);

	// Handle SSE completion
	useEffect(() => {
		if (!jobId || sseState.status !== "done") return;
		if (handledJobRef.current === jobId) return;
		handledJobRef.current = jobId;

		let cancelled = false;
		const finish = () => {
			if (cancelled) return;
			setIsExtracting(false);
			setJobId(null);
		};

		const fetchResult = async () => {
			try {
				const response = await getExtractionResultFn({
					data: { jobId },
				});

				if (response.notFound || response.status !== "done") {
					finish();
					return;
				}

				// SAFETY: the extraction job stores this shape.
				const result = response.result as {
					title?: string;
					authors?: {
						firstName: string;
						lastName: string;
						email?: string;
						affiliationName?: string;
					}[];
					keywords?: string[];
				} | null;

				if (!result) {
					finish();
					return;
				}

				const extracted: Parameters<typeof onExtractedRef.current>[0] = {};
				if (result.title) extracted.title = result.title;
				if (result.authors && result.authors.length > 0)
					extracted.authors = mapToFormAuthors(result.authors);
				if (result.keywords && result.keywords.length > 0)
					extracted.keywords = result.keywords;

				if (!cancelled) onExtractedRef.current(extracted);
			} catch (error) {
				console.error("[extraction] Failed to fetch result:", error);
			}
			finish();
		};

		void fetchResult();
		return () => {
			cancelled = true;
		};
	}, [jobId, sseState.status]);

	// Handle SSE error
	useEffect(() => {
		if (!jobId || sseState.status !== "error") return;
		if (handledJobRef.current === jobId) return;
		handledJobRef.current = jobId;

		console.error("[extraction] Job failed:", sseState.error);
		toast.error(`Extraction failed: ${sseState.error ?? "unknown error"}`);
		setIsExtracting(false);
		setJobId(null);
	}, [jobId, sseState.status, sseState.error]);

	// Cleanup on unmount — abort any in-flight extraction
	useEffect(() => {
		return () => {
			abortRef.current?.abort();
		};
	}, []);

	const handleFileChange = async (
		file: File | null,
		fieldHandleChange: (file: File | null) => void,
	) => {
		fieldHandleChange(file);

		if (
			!file ||
			!enabled ||
			skipExtraction ||
			!SUPPORTED_FILE_EXTENSIONS_DOTTED.some((ext) =>
				file.name.toLowerCase().endsWith(ext),
			)
		) {
			return;
		}

		// Abort previous extraction if still running (prevents race condition)
		abortRef.current?.abort();
		const controller = new AbortController();
		abortRef.current = controller;

		setIsExtracting(true);
		setElapsedSeconds(0);
		setJobId(null);
		handledJobRef.current = null;

		try {
			const formData = new FormData();
			formData.append("file", file);

			if (controller.signal.aborted) return;

			const { jobId: newJobId } = await enqueueExtractionFn({
				data: formData,
			});

			if (controller.signal.aborted) return;

			setJobId(newJobId);
		} catch (error) {
			if (!controller.signal.aborted) {
				console.error("[extraction] Client extraction failed:", error);
				const message =
					error instanceof Error ? error.message : "unknown error";
				toast.error(`Extraction failed: ${message}`);
				setIsExtracting(false);
			}
		}
	};

	return {
		isExtracting,
		elapsedSeconds,
		stage: sseState.stage,
		progress: { current: sseState.current, total: sseState.total },
		handleFileChange,
	};
}
