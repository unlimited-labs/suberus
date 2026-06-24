import {
	closestCenter,
	DndContext,
	type DragEndEvent,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	arrayMove,
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
	IconCircleDot,
	IconCursorText,
	IconGripVertical,
	IconListCheck,
	IconPlus,
	IconSquareCheck,
	IconX,
} from "@tabler/icons-react";
import type { ComponentType } from "react";
import type { SurveyQuestionType } from "@/generated/prisma/enums";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

export interface SurveyQuestion {
	id: string;
	label: string;
	type: SurveyQuestionType;
	options: string[] | null;
	allowOther: boolean;
	isRequired: boolean;
	orderIndex: number;
	isActive: boolean;
	showInUsersList: boolean;
	fieldName: string | null;
}

/** Short labels for the list row badges (also asserted by E2E). */
export const TYPE_LABELS: Record<SurveyQuestionType, string> = {
	CHECKBOX: "Checkbox",
	TEXT: "Text",
	SINGLE_SELECT: "Single",
	MULTI_SELECT: "Multi",
};

/** Icon + full label + one-line hint per type, for the visual picker and rows. */
export const TYPE_META: Record<
	SurveyQuestionType,
	{
		label: string;
		description: string;
		icon: ComponentType<{ className?: string }>;
	}
> = {
	CHECKBOX: {
		label: "Checkbox",
		description: "A single yes/no opt-in",
		icon: IconSquareCheck,
	},
	TEXT: {
		label: "Text",
		description: "Free-text answer",
		icon: IconCursorText,
	},
	SINGLE_SELECT: {
		label: "Single select",
		description: "Pick one option",
		icon: IconCircleDot,
	},
	MULTI_SELECT: {
		label: "Multi select",
		description: "Pick several options",
		icon: IconListCheck,
	},
};

const TYPE_ORDER: readonly SurveyQuestionType[] = [
	"CHECKBOX",
	"TEXT",
	"SINGLE_SELECT",
	"MULTI_SELECT",
];

export const isSelectType = (type: SurveyQuestionType) =>
	type === "SINGLE_SELECT" || type === "MULTI_SELECT";

/** Visual type picker: 2×2 grid of icon cards, replaces the plain dropdown. */
export function TypePicker({
	value,
	onChange,
}: {
	value: SurveyQuestionType;
	onChange: (v: SurveyQuestionType) => void;
}) {
	return (
		<div className="grid grid-cols-2 gap-2" data-testid="type-picker">
			{TYPE_ORDER.map((type) => {
				const meta = TYPE_META[type];
				const Icon = meta.icon;
				const selected = value === type;
				return (
					<button
						key={type}
						type="button"
						data-testid={`type-option-${type}`}
						aria-pressed={selected}
						onClick={() => onChange(type)}
						className={cn(
							"flex items-start gap-2.5 rounded-lg border p-3 text-left transition-colors",
							selected
								? "border-primary bg-primary/5 ring-1 ring-primary"
								: "border-border bg-card hover:border-primary/40 hover:bg-muted/40",
						)}
					>
						<Icon
							className={cn(
								"mt-0.5 size-5 shrink-0",
								selected ? "text-primary" : "text-muted-foreground",
							)}
						/>
						<span className="min-w-0">
							<span className="block text-sm font-medium leading-tight">
								{meta.label}
							</span>
							<span className="mt-0.5 block text-xs text-muted-foreground leading-snug">
								{meta.description}
							</span>
						</span>
					</button>
				);
			})}
		</div>
	);
}

function SortableOption({
	id,
	index,
	value,
	onChange,
	onRemove,
}: {
	id: string;
	index: number;
	value: string;
	onChange: (value: string) => void;
	onRemove: () => void;
}) {
	const { attributes, listeners, setNodeRef, transform, transition } =
		useSortable({ id, animateLayoutChanges: () => false });
	return (
		<div
			ref={setNodeRef}
			style={{ transform: CSS.Transform.toString(transform), transition }}
			className="flex items-center gap-1.5"
		>
			<button
				type="button"
				className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
				aria-label="Reorder option"
				{...attributes}
				{...listeners}
			>
				<IconGripVertical className="size-4" />
			</button>
			<Input
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={`Option ${index + 1}`}
				className="h-8 text-sm"
			/>
			<Button
				type="button"
				variant="ghost"
				size="icon-sm"
				onClick={onRemove}
				aria-label="Remove option"
			>
				<IconX className="size-3.5" />
			</Button>
		</div>
	);
}

/** Controlled editor for select-question options, with drag-to-reorder. */
export function OptionsEditor({
	options,
	onChange,
}: {
	options: string[];
	onChange: (options: string[]) => void;
}) {
	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;
		if (over && active.id !== over.id) {
			onChange(arrayMove(options, Number(active.id), Number(over.id)));
		}
	};

	return (
		<div className="space-y-1.5 rounded-md border border-border/50 bg-background p-3">
			<Label className="text-xs font-medium text-muted-foreground">
				Options
			</Label>
			{/* Index ids: keying inputs by value remounts them on every keystroke,
			    and duplicates collide while two empty options exist. */}
			<DndContext
				sensors={sensors}
				collisionDetection={closestCenter}
				onDragEnd={handleDragEnd}
			>
				<SortableContext
					items={options.map((_, i) => i.toString())}
					strategy={verticalListSortingStrategy}
				>
					{options.map((opt, i) => (
						<SortableOption
							key={i}
							id={i.toString()}
							index={i}
							value={opt}
							onChange={(v) => {
								const next = [...options];
								next[i] = v;
								onChange(next);
							}}
							onRemove={() => onChange(options.filter((_, j) => j !== i))}
						/>
					))}
				</SortableContext>
			</DndContext>
			<Button
				type="button"
				variant="outline"
				size="sm"
				onClick={() => onChange([...options, ""])}
			>
				<IconPlus className="mr-1 size-3" />
				Add option
			</Button>
		</div>
	);
}
