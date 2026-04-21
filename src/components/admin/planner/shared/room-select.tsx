import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

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
			value={value ?? NONE}
			onValueChange={(v) => onValueChange(v === NONE ? null : v)}
		>
			<SelectTrigger data-testid={testId} className={triggerClassName}>
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
