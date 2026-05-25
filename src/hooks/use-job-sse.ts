import { useEffect, useRef, useState } from "react";

export interface JobSSEState {
	status: "pending" | "running" | "done" | "error" | null;
	stage: string;
	current: number;
	total: number;
	error: string | null;
	connected: boolean;
}

const initialState: JobSSEState = {
	status: null,
	stage: "",
	current: 0,
	total: 0,
	error: null,
	connected: false,
};

export function useJobSSE(jobId: string | null): JobSSEState {
	const [state, setState] = useState<JobSSEState>(initialState);
	const esRef = useRef<EventSource | null>(null);

	useEffect(() => {
		if (!jobId) {
			setState(initialState);
			return;
		}

		setState({ ...initialState });

		const es = new EventSource(`/api/jobs/sse/${jobId}`);
		esRef.current = es;

		es.onopen = () => {
			setState((prev) => ({ ...prev, connected: true }));
		};

		es.onmessage = (event: MessageEvent<string>) => {
			try {
				const data = JSON.parse(event.data) as {
					status: JobSSEState["status"];
					stage: string;
					current: number;
					total: number;
					error: string | null;
				};

				setState((prev) => ({
					...prev,
					status: data.status,
					stage: data.stage,
					current: data.current,
					total: data.total,
					error: data.error,
				}));

				if (data.status === "done" || data.status === "error") {
					es.close();
					setState((prev) => ({ ...prev, connected: false }));
				}
			} catch {
				// ignore malformed messages
			}
		};

		es.addEventListener("error", (event: MessageEvent<string>) => {
			try {
				const data = JSON.parse(event.data) as { error: string };
				setState((prev) => ({
					...prev,
					status: "error",
					error: data.error,
					connected: false,
				}));
			} catch {
				setState((prev) => ({ ...prev, connected: false }));
			}
			es.close();
		});

		es.onerror = () => {
			setState((prev) => ({ ...prev, connected: false }));
			es.close();
		};

		return () => {
			es.close();
			esRef.current = null;
		};
	}, [jobId]);

	return state;
}
