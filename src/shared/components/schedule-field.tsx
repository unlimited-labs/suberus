import { useId } from "react";
import { useDateFormat } from "@/shared/hooks/use-date-format";
import type { ScheduleControl } from "@/shared/hooks/use-schedule";
import { Field, FieldDescription, FieldLabel } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { Switch } from "@/shared/ui/switch";

interface ScheduleFieldProps {
	control: ScheduleControl;
	label: string;
	testId: string;
}

export function ScheduleField({ control, label, testId }: ScheduleFieldProps) {
	const switchId = useId();
	const { formatDateTimeWithZone } = useDateFormat();

	return (
		<div className="space-y-3">
			<Field orientation="horizontal">
				<Switch
					// Base UI puts `id` on the hidden input, so htmlFor alone leaves the
					// visible role=switch unnamed.
					aria-label={label}
					checked={control.enabled}
					data-testid={`${testId}-switch`}
					id={switchId}
					onCheckedChange={control.setEnabled}
				/>
				<FieldLabel
					className="cursor-pointer text-sm font-normal"
					htmlFor={switchId}
				>
					{label}
				</FieldLabel>
			</Field>
			{control.enabled ? (
				<>
					<Input
						aria-label={label}
						data-testid={`${testId}-input`}
						onChange={(e) => control.setLocal(e.target.value)}
						type="datetime-local"
						value={control.local}
					/>
					<FieldDescription>
						{control.iso
							? formatDateTimeWithZone(control.iso)
							: "Pick a time in the future."}
					</FieldDescription>
				</>
			) : null}
		</div>
	);
}
