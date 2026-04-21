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
	value: string;
	onValueChange: (v: string) => void;
	rooms: Room[];
	testId?: string;
	triggerClassName?: string;
	placeholder?: string;
}

export function RoomSelect({
	value,
	onValueChange,
	rooms,
	testId,
	triggerClassName,
	placeholder = "No room",
}: Props) {
	return (
		<Select value={value} onValueChange={onValueChange}>
			<SelectTrigger data-testid={testId} className={triggerClassName}>
				<SelectValue placeholder={placeholder} />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="none">{placeholder}</SelectItem>
				{rooms.map((r) => (
					<SelectItem key={r.id} value={r.id}>
						{r.name}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
