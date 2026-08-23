import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
	applyAutoPlanFn,
	autoPlanJobQueryOptions,
	startAutoPlanFn,
} from "@/features/planner/api/autoplan";
import {
	programSessionKeys,
	unscheduledSubmissionKeys,
} from "@/features/planner/api/sessions";
import { deriveAutoPlanState } from "@/features/planner/components/hooks/derive-auto-plan-state";
import { useJobSSE } from "@/shared/hooks/use-job-sse";

export function useAutoPlanState() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [jobId, setJobId] = useState<string | null>(null);

	const start = useMutation({
		mutationFn: () => startAutoPlanFn(),
		onSuccess: (res) => setJobId(res.jobId),
	});

	const sse = useJobSSE(jobId);

	const jobResult = useQuery({
		...autoPlanJobQueryOptions(jobId),
		enabled: jobId !== null && sse.status === "done",
	});

	const apply = useMutation({
		mutationFn: (id: string) => applyAutoPlanFn({ data: { jobId: id } }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: programSessionKeys.all });
			queryClient.invalidateQueries({
				queryKey: unscheduledSubmissionKeys.all,
			});
			toast.success("Auto-plan applied");
			navigate({ to: "/admin/program-planner" });
		},
	});

	const { running, proposal, errorMsg } = deriveAutoPlanState({
		jobData: jobResult.data ?? undefined,
		startPending: start.isPending,
		sseStatus: sse.status,
		sseError: sse.error,
		applyError: apply.error,
		startError: start.error,
	});

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
