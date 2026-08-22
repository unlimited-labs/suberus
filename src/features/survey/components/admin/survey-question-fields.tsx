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
import { type ComponentType, useState } from "react";
import type {
	SurveyAudience,
	SurveyQuestionType,
} from "@/generated/prisma/enums";
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
	audience: SurveyAudience;
}

export const AUDIENCE_LABELS = {
	ALL: "Everyone",
	PARTICIPANTS: "Participants",
	EXHIBITORS: "Exhibitors",
} satisfies Record<SurveyAudience, string>;

/** Short labels for the list row badges (also asserted by E2E). */
export const TYPE_LABELS = {
	CHECKBOX: "Checkbox",
	TEXT: "Text",
	SINGLE_SELECT: "Single",
	MULTI_SELECT: "Multi",
} satisfies Record<SurveyQuestionType, string>;

export const TYPE_META = {
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
} satisfies Record<
	SurveyQuestionType,
	{
		label: string;
		description: string;
		icon: ComponentType<{ className?: string }>;
	}
>;

const TYPE_ORDER: readonly SurveyQuestionType[] = [
	"CHECKBOX",
	"TEXT",
	"SINGLE_SELECT",
	"MULTI_SELECT",
];

export const isSelectType = (type: SurveyQuestionType) =>
	type === "SINGLE_SELECT" || type === "MULTI_SELECT";

export function TypePicker({
	value,
	onChange,
}: {
	value: SurveyQuestionType;
	onChange: (v: SurveyQuestionType) => void;
}) {
	return (
		<div
			className="grid grid-cols-2 gap-2 sm:grid-cols-4"
			data-testid="type-picker"
		>
			{TYPE_ORDER.map((type) => {
				const meta = TYPE_META[type];
				const Icon = meta.icon;
				const selected = value === type;
				return (
					<button
						aria-pressed={selected}
						className={cn(
							"flex flex-col items-center gap-1 rounded-lg border p-2 text-center transition-colors",
							selected
								? "border-primary bg-primary/5 ring-1 ring-primary"
								: "border-border bg-card hover:border-primary/40 hover:bg-muted/40",
						)}
						data-testid={`type-option-${type}`}
						key={type}
						onClick={() => onChange(type)}
						title={meta.description}
						type="button"
					>
						<Icon
							className={cn(
								"size-5 shrink-0",
								selected ? "text-primary" : "text-muted-foreground",
							)}
						/>
						<span className="text-xs leading-tight font-medium">
							{meta.label}
						</span>
					</button>
				);
			})}
		</div>
	);
}

const AUDIENCE_ORDER: readonly SurveyAudience[] = [
	"ALL",
	"PARTICIPANTS",
	"EXHIBITORS",
];

export function AudiencePicker({
	value,
	onChange,
}: {
	value: SurveyAudience;
	onChange: (v: SurveyAudience) => void;
}) {
	return (
		<div
			className="border-border bg-card flex gap-1 rounded-lg border p-1"
			data-testid="audience-picker"
		>
			{AUDIENCE_ORDER.map((audience) => {
				const selected = value === audience;
				return (
					<button
						aria-pressed={selected}
						className={cn(
							"flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
							selected
								? "bg-primary text-primary-foreground"
								: "text-muted-foreground hover:bg-muted/60",
						)}
						data-testid={`audience-option-${audience}`}
						key={audience}
						onClick={() => onChange(audience)}
						type="button"
					>
						{AUDIENCE_LABELS[audience]}
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
			className="flex items-center gap-1.5"
			ref={setNodeRef}
			style={{ transform: CSS.Transform.toString(transform), transition }}
		>
			<button
				aria-label="Reorder option"
				className="text-muted-foreground hover:text-foreground cursor-grab touch-none active:cursor-grabbing"
				type="button"
				{...attributes}
				{...listeners}
			>
				<IconGripVertical className="size-4" />
			</button>
			<Input
				className="h-8 text-sm"
				onChange={(e) => onChange(e.target.value)}
				placeholder={`Option ${index + 1}`}
				value={value}
			/>
			<Button
				aria-label="Remove option"
				onClick={onRemove}
				size="icon-sm"
				type="button"
				variant="ghost"
			>
				<IconX className="size-3.5" />
			</Button>
		</div>
	);
}

export function OptionsEditor({
	options,
	onChange,
}: {
	options: string[];
	onChange: (options: string[]) => void;
}) {
	const [ids, setIds] = useState<string[]>(() =>
		options.map(() => crypto.randomUUID()),
	);
	const itemIds =
		ids.length === options.length
			? ids
			: Array.from(
					{ length: options.length },
					(_, i) => ids[i] ?? crypto.randomUUID(),
				);
	if (itemIds !== ids) setIds(itemIds);

	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;
		if (over && active.id !== over.id) {
			const from = itemIds.indexOf(String(active.id));
			const to = itemIds.indexOf(String(over.id));
			setIds(arrayMove(itemIds, from, to));
			onChange(arrayMove(options, from, to));
		}
	};

	return (
		<div className="border-border/50 bg-background space-y-1.5 rounded-md border p-3">
			<Label className="text-muted-foreground text-xs font-medium">
				Options
			</Label>
			<DndContext
				collisionDetection={closestCenter}
				onDragEnd={handleDragEnd}
				sensors={sensors}
			>
				<SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
					<div className="max-h-44 space-y-1.5 overflow-y-auto">
						{options.map((opt, i) => (
							<SortableOption
								id={itemIds[i]}
								index={i}
								key={itemIds[i]}
								onChange={(v) => {
									const next = [...options];
									next[i] = v;
									onChange(next);
								}}
								onRemove={() => {
									setIds(itemIds.filter((_, j) => j !== i));
									onChange(options.filter((_, j) => j !== i));
								}}
								value={opt}
							/>
						))}
					</div>
				</SortableContext>
			</DndContext>
			<Button
				onClick={() => onChange([...options, ""])}
				size="sm"
				type="button"
				variant="outline"
			>
				<IconPlus className="mr-1 size-3" />
				Add option
			</Button>
		</div>
	);
}
