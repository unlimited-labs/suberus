import { useCallback, useEffect, useRef, useState } from "react";
import { extractDocumentMetadataFn } from "@/utils/extraction.functions";
import type { Author } from "./authors-input";

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
	handleFileChange: (
		file: File | null,
		fieldHandleChange: (file: File | null) => void,
	) => void;
}

const EXTRACTION_TIMEOUT_MS = 30_000;

function fileToBase64(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			const result = reader.result as string;
			resolve(result.split(",")[1]);
		};
		reader.onerror = reject;
		reader.readAsDataURL(file);
	});
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
	const abortRef = useRef<AbortController | null>(null);

	// Stable ref for callback — updated via effect, not during render
	const onExtractedRef = useRef(onExtracted);
	useEffect(() => {
		onExtractedRef.current = onExtracted;
	}, [onExtracted]);

	// Elapsed timer
	useEffect(() => {
		if (!isExtracting) return;
		const interval = setInterval(() => {
			setElapsedSeconds((prev) => prev + 1);
		}, 1000);
		return () => clearInterval(interval);
	}, [isExtracting]);

	// Cleanup on unmount — abort any in-flight extraction
	useEffect(() => {
		return () => {
			abortRef.current?.abort();
		};
	}, []);

	const handleFileChange = useCallback(
		async (
			file: File | null,
			fieldHandleChange: (file: File | null) => void,
		) => {
			fieldHandleChange(file);

			if (
				!file ||
				!enabled ||
				skipExtraction ||
				!file.name.toLowerCase().endsWith(".docx")
			) {
				return;
			}

			// Abort previous extraction if still running (prevents race condition)
			abortRef.current?.abort();
			const controller = new AbortController();
			abortRef.current = controller;

			setIsExtracting(true);
			setElapsedSeconds(0);

			try {
				const fileBase64 = await fileToBase64(file);

				if (controller.signal.aborted) return;

				const timeout = new Promise<never>((_, reject) =>
					setTimeout(
						() => reject(new Error("extraction timeout")),
						EXTRACTION_TIMEOUT_MS,
					),
				);

				const result = await Promise.race([
					extractDocumentMetadataFn({
						data: { fileBase64, fileName: file.name },
					}),
					timeout,
				]);

				if (controller.signal.aborted) return;

				const extracted: Parameters<typeof onExtractedRef.current>[0] = {};
				if (result.title) extracted.title = result.title;
				if (result.authors && result.authors.length > 0)
					extracted.authors = mapToFormAuthors(result.authors);
				if (result.keywords && result.keywords.length > 0)
					extracted.keywords = result.keywords;

				onExtractedRef.current(extracted);
			} catch (error) {
				if (!controller.signal.aborted) {
					console.error("[extraction] Client extraction failed:", error);
				}
			} finally {
				if (!controller.signal.aborted) {
					setIsExtracting(false);
				}
			}
		},
		[enabled, skipExtraction],
	);

	return { isExtracting, elapsedSeconds, handleFileChange };
}
