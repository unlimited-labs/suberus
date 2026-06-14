import {
	closestCenter,
	DndContext,
	type DragEndEvent,
	DragOverlay,
	type DragStartEvent,
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
	IconGripVertical,
	IconPlus,
	IconStar,
	IconStarFilled,
	IconTrash,
} from "@tabler/icons-react";
import { useCallback, useState } from "react";
import { AffiliationSelect } from "@/shared/components/affiliation-select";
import { cn } from "@/shared/lib/utils";
import type { Author } from "@/shared/types/author";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

interface AuthorsInputProps {
	value: Author[];
	onChange: (authors: Author[]) => void;
	className?: string;
}

interface SortableAuthorItemProps {
	author: Author;
	index: number;
	updateAuthor: (index: number, updates: Partial<Author>) => void;
	removeAuthor: (index: number) => void;
	setPresenter: (index: number) => void;
	canRemove: boolean;
	isDragOverlay?: boolean;
}

function SortableAuthorItem({
	author,
	index,
	updateAuthor,
	removeAuthor,
	setPresenter,
	canRemove,
	isDragOverlay = false,
}: SortableAuthorItemProps) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({
		id: index.toString(),
		animateLayoutChanges: () => false, // Disable animation after drop
	});

	const style = isDragOverlay
		? undefined
		: {
				transform: CSS.Transform.toString(transform),
				transition,
			};

	const content = (
		<div
			ref={isDragOverlay ? undefined : setNodeRef}
			style={style}
			data-testid={`author-card-${index}`}
			className={cn(
				"group relative rounded-lg border bg-card",
				author.isPresenter
					? "border-primary/30 bg-primary/5"
					: "border-border/50",
				isDragging && !isDragOverlay && "opacity-0",
				isDragOverlay && "shadow-2xl rotate-2",
			)}
		>
			{/* Compact Header */}
			<div className="flex items-center gap-3 px-4 py-2.5 border-b border-border/30">
				{/* Drag Handle */}
				<button
					type="button"
					className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground transition-colors"
					{...(isDragOverlay ? {} : attributes)}
					{...(isDragOverlay ? {} : listeners)}
				>
					<IconGripVertical className="size-4" />
				</button>

				<div className="flex items-center gap-2 flex-1">
					<div
						className={cn(
							"w-6 h-6 rounded-md flex items-center justify-center text-xs font-semibold",
							author.isPresenter
								? "bg-primary/10 text-primary"
								: "bg-muted/50 text-muted-foreground",
						)}
					>
						{index + 1}
					</div>
					<button
						type="button"
						onClick={() => !isDragOverlay && setPresenter(index)}
						className={cn(
							"flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-all",
							author.isPresenter
								? "text-primary"
								: "text-muted-foreground hover:text-foreground",
						)}
						aria-label={
							author.isPresenter ? "Presenting author" : "Set as presenter"
						}
					>
						{author.isPresenter ? (
							<IconStarFilled className="size-3" />
						) : (
							<IconStar className="size-3" />
						)}
						<span className="hidden sm:inline">
							{author.isPresenter ? "Presenter" : "Set presenter"}
						</span>
					</button>
				</div>
				<Button
					type="button"
					size="icon-xs"
					variant="ghost"
					onClick={() => !isDragOverlay && removeAuthor(index)}
					disabled={!canRemove}
					className="opacity-0 group-hover:opacity-100 transition-opacity"
					aria-label="Remove author"
				>
					<IconTrash className="size-3.5" />
				</Button>
			</div>

			{/* Compact Fields Grid */}
			<div className="p-4 space-y-3">
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<div className="space-y-1.5">
						<Label
							htmlFor={`author-${index}-firstName`}
							className="text-xs text-muted-foreground"
						>
							First name
						</Label>
						<Input
							id={`author-${index}-firstName`}
							type="text"
							value={author.firstName}
							onChange={(e) =>
								updateAuthor(index, { firstName: e.target.value })
							}
							required
							className="h-9 text-sm text-foreground"
							disabled={isDragOverlay}
						/>
					</div>

					<div className="space-y-1.5">
						<Label
							htmlFor={`author-${index}-lastName`}
							className="text-xs text-muted-foreground"
						>
							Last name
						</Label>
						<Input
							id={`author-${index}-lastName`}
							type="text"
							value={author.lastName}
							onChange={(e) =>
								updateAuthor(index, { lastName: e.target.value })
							}
							required
							className="h-9 text-sm text-foreground"
							disabled={isDragOverlay}
						/>
					</div>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<div className="space-y-1.5">
						<Label
							htmlFor={`author-${index}-email`}
							className="text-xs text-muted-foreground"
						>
							Email
						</Label>
						<Input
							id={`author-${index}-email`}
							type="email"
							value={author.email}
							onChange={(e) => updateAuthor(index, { email: e.target.value })}
							required
							className="h-9 text-sm text-foreground"
							disabled={isDragOverlay}
						/>
					</div>

					<div className="space-y-1.5">
						<Label className="text-xs text-muted-foreground">Affiliation</Label>
						{isDragOverlay ? (
							<div className="h-9 flex items-center px-3 rounded-md border bg-background text-sm text-foreground">
								{author.affiliationName || "—"}
							</div>
						) : (
							<AffiliationSelect
								value={author.affiliationId}
								displayValue={author.affiliationName}
								initValueId={author.affiliationId}
								onChange={(id, name) =>
									updateAuthor(index, {
										affiliationId: id,
										affiliationName: name,
									})
								}
							/>
						)}
					</div>
				</div>
			</div>
		</div>
	);

	return content;
}

export function AuthorsInput({
	value,
	onChange,
	className,
}: AuthorsInputProps) {
	const [activeId, setActiveId] = useState<string | null>(null);
	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	const addAuthor = useCallback(() => {
		const newAuthor: Author = {
			firstName: "",
			lastName: "",
			email: "",
			affiliationId: null,
			affiliationName: "",
			isPresenter: value.length === 0,
		};

		onChange([...value, newAuthor]);
	}, [value, onChange]);

	const removeAuthor = useCallback(
		(index: number) => {
			const newAuthors = value.filter((_, i) => i !== index);

			if (value[index].isPresenter && newAuthors.length > 0) {
				newAuthors[0].isPresenter = true;
			}

			onChange(newAuthors);
		},
		[value, onChange],
	);

	const updateAuthor = useCallback(
		(index: number, updates: Partial<Author>) => {
			const newAuthors = [...value];
			newAuthors[index] = { ...newAuthors[index], ...updates };
			onChange(newAuthors);
		},
		[value, onChange],
	);

	const setPresenter = useCallback(
		(index: number) => {
			const newAuthors = value.map((author, i) => ({
				...author,
				isPresenter: i === index,
			}));
			onChange(newAuthors);
		},
		[value, onChange],
	);

	const handleDragStart = useCallback((event: DragStartEvent) => {
		setActiveId(event.active.id.toString());
	}, []);

	const handleDragEnd = useCallback(
		(event: DragEndEvent) => {
			const { active, over } = event;

			if (over && active.id !== over.id) {
				const oldIndex = Number(active.id);
				const newIndex = Number(over.id);
				onChange(arrayMove(value, oldIndex, newIndex));
			}

			setActiveId(null);
		},
		[value, onChange],
	);

	const handleDragCancel = useCallback(() => {
		setActiveId(null);
	}, []);

	const activeIndex = activeId !== null ? Number(activeId) : -1;
	const activeAuthor = activeIndex >= 0 ? value[activeIndex] : null;

	return (
		<div className={cn("space-y-3", className)}>
			<DndContext
				sensors={sensors}
				collisionDetection={closestCenter}
				onDragStart={handleDragStart}
				onDragEnd={handleDragEnd}
				onDragCancel={handleDragCancel}
			>
				<SortableContext
					items={value.map((_, index) => index.toString())}
					strategy={verticalListSortingStrategy}
				>
					{value.map((author, index) => (
						<SortableAuthorItem
							key={index}
							author={author}
							index={index}
							updateAuthor={updateAuthor}
							removeAuthor={removeAuthor}
							setPresenter={setPresenter}
							canRemove={value.length > 1}
						/>
					))}
				</SortableContext>
				<DragOverlay dropAnimation={null}>
					{activeAuthor && (
						<SortableAuthorItem
							author={activeAuthor}
							index={activeIndex}
							updateAuthor={updateAuthor}
							removeAuthor={removeAuthor}
							setPresenter={setPresenter}
							canRemove={value.length > 1}
							isDragOverlay
						/>
					)}
				</DragOverlay>
			</DndContext>

			<button
				type="button"
				onClick={addAuthor}
				className={cn(
					"w-full flex items-center justify-center gap-2 py-3 rounded-lg",
					"border border-dashed border-border/50",
					"text-xs font-medium text-muted-foreground",
					"hover:border-primary hover:text-primary hover:bg-primary/5",
					"transition-all",
				)}
			>
				<IconPlus className="size-3.5" />
				Add Author
			</button>
		</div>
	);
}
