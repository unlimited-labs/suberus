import { IconBell } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
	reminderLeadQueryOptions,
	setReminderLeadFn,
} from "@/features/planner/api/schedule";
import { Input } from "@/shared/ui/input";

export function ReminderLeadControl() {
	const queryClient = useQueryClient();
	const { data } = useQuery(reminderLeadQueryOptions());
	const [value, setValue] = useState("");

	useEffect(() => {
		if (data != null) setValue(String(data));
	}, [data]);

	const { mutate, isPending } = useMutation({
		mutationFn: (leadMin: number) => setReminderLeadFn({ data: { leadMin } }),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: reminderLeadQueryOptions().queryKey,
			});
			toast.success("Reminder lead time saved");
		},
		onError: () => toast.error("Could not save reminder lead time"),
	});

	const commit = () => {
		const n = Number(value);
		if (!Number.isInteger(n) || n < 1 || n > 120) {
			if (data != null) setValue(String(data));
			return;
		}
		if (n !== data) mutate(n);
	};

	return (
		<label
			htmlFor="reminder-lead-input"
			className="flex items-center gap-1.5 text-sm text-muted-foreground"
			title="Push reminder lead time before a favourited talk starts"
		>
			<IconBell size={14} />
			<span className="hidden sm:inline">Reminder</span>
			<Input
				id="reminder-lead-input"
				type="number"
				min={1}
				max={120}
				value={value}
				disabled={isPending}
				onChange={(e) => setValue(e.target.value)}
				onBlur={commit}
				className="h-8 w-16"
				data-testid="reminder-lead-input"
			/>
			<span>min</span>
		</label>
	);
}
