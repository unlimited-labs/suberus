import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

interface Track {
	id: string;
	name: string;
	color: string | null;
}

interface Props {
	value: string;
	onValueChange: (v: string) => void;
	tracks: Track[];
	testId?: string;
	triggerClassName?: string;
}

export function TrackSelect({
	value,
	onValueChange,
	tracks,
	testId,
	triggerClassName,
}: Props) {
	return (
		<Select value={value} onValueChange={onValueChange}>
			<SelectTrigger data-testid={testId} className={triggerClassName}>
				<SelectValue placeholder="No track" />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="none">No track</SelectItem>
				{tracks.map((t) => (
					<SelectItem key={t.id} value={t.id}>
						<span className="flex items-center gap-2">
							{t.color && (
								<span
									className="size-2.5 shrink-0 rounded-full"
									style={{ backgroundColor: t.color }}
								/>
							)}
							{t.name}
						</span>
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
