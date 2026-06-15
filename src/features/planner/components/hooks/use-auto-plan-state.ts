import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
	applyAutoPlanFn,
	getAutoPlanJobFn,
	startAutoPlanFn,
} from "@/features/planner/api/autoplan";
import { useJobSSE } from "@/shared/hooks/use-job-sse";

/**
 * Owns the auto-plan workflow: start mutation, job SSE progress, deferred result
 * query and apply mutation, plus the derived running/error/proposal state. Leaves
 * AutoPlanPage as pure view selection.
 */
export function useAutoPlanState() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [jobId, setJobId] = useState<string | null>(null);

	const start = useMutation({
		mutationFn: () => startAutoPlanFn(),
		onSuccess: (res) => setJobId(res.jobId),
	});

	const sse = useJobSSE(jobId);

	// Only fetch full proposal data when job completes
	const jobResult = useQuery({
		queryKey: ["autoplan-job", jobId],
		queryFn: () =>
			jobId ? getAutoPlanJobFn({ data: { jobId } }) : Promise.resolve(null),
		enabled: jobId !== null && sse.status === "done",
	});

	const apply = useMutation({
		mutationFn: (id: string) => applyAutoPlanFn({ data: { jobId: id } }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["programSessions"] });
			queryClient.invalidateQueries({ queryKey: ["unscheduledSubmissions"] });
			toast.success("Auto-plan applied");
			navigate({ to: "/admin/program-planner" });
		},
	});

	const data =
		jobResult.data && !jobResult.data.notFound ? jobResult.data : null;
	const running =
		start.isPending || sse.status === "running" || sse.status === "pending";
	const proposal =
		sse.status === "done" && data?.proposal && !data.appliedAt
			? data.proposal
			: null;
	const errorMsg =
		sse.status === "error"
			? (sse.error ?? "Unknown error")
			: apply.error
				? apply.error.message
				: start.error
					? start.error.message
					: null;

	function goBack() {
		navigate({ to: "/admin/program-planner" });
	}

	return {
		jobId,
		sse,
		running,
		errorMsg,
		proposal,
		startPending: start.isPending,
		generate: () => start.mutate(),
		applyPlan: () => jobId && apply.mutate(jobId),
		applying: apply.isPending,
		goBack,
	};
}
