import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/ui/select";

interface Room {
	id: string;
	name: string;
}

interface Props {
	value: string | null;
	onValueChange: (v: string | null) => void;
	rooms: Room[];
	testId?: string;
	triggerClassName?: string;
	placeholder?: string;
}

const NONE = "__none__";

export function RoomSelect({
	value,
	onValueChange,
	rooms,
	testId,
	triggerClassName,
	placeholder = "No room",
}: Props) {
	return (
		<Select
			items={[
				{ value: NONE, label: placeholder },
				...rooms.map((r) => ({ value: r.id, label: r.name })),
			]}
			onValueChange={(v) => onValueChange(v === NONE ? null : v)}
			value={value ?? NONE}
		>
			<SelectTrigger className={triggerClassName} data-testid={testId}>
				<SelectValue placeholder={placeholder} />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value={NONE}>{placeholder}</SelectItem>
				{rooms.map((r) => (
					<SelectItem key={r.id} value={r.id}>
						{r.name}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
