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
import { useState } from "react";
import { AffiliationSelect } from "@/shared/components/affiliation-select";
import {
	affiliationDisplay,
	authorCardClassName,
	presenterAriaLabel,
	presenterBadgeClassName,
	presenterButtonClassName,
	presenterLabel,
} from "@/shared/components/author-card-styles";
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

type DragHandle = Pick<
	ReturnType<typeof useSortable>,
	"attributes" | "listeners"
>;

function AuthorCardHeader({
	index,
	isPresenter,
	isDragOverlay,
	canRemove,
	handle,
	setPresenter,
	removeAuthor,
}: {
	index: number;
	isPresenter: boolean;
	isDragOverlay: boolean;
	canRemove: boolean;
	handle: DragHandle;
	setPresenter: (index: number) => void;
	removeAuthor: (index: number) => void;
}) {
	return (
		<div className="flex items-center gap-3 px-4 py-2.5 border-b border-border/30">
			{/* Drag Handle */}
			<button
				className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground transition-colors"
				type="button"
				{...(isDragOverlay ? {} : handle.attributes)}
				{...(isDragOverlay ? {} : handle.listeners)}
			>
				<IconGripVertical className="size-4" />
			</button>

			<div className="flex items-center gap-2 flex-1">
				<div className={presenterBadgeClassName(isPresenter)}>{index + 1}</div>
				<button
					aria-label={presenterAriaLabel(isPresenter)}
					className={presenterButtonClassName(isPresenter)}
					onClick={() => !isDragOverlay && setPresenter(index)}
					type="button"
				>
					{isPresenter ? (
						<IconStarFilled className="size-3" />
					) : (
						<IconStar className="size-3" />
					)}
					<span className="hidden sm:inline">
						{presenterLabel(isPresenter)}
					</span>
				</button>
			</div>
			<Button
				aria-label="Remove author"
				className="opacity-0 group-hover:opacity-100 transition-opacity"
				disabled={!canRemove}
				onClick={() => !isDragOverlay && removeAuthor(index)}
				size="icon-xs"
				type="button"
				variant="ghost"
			>
				<IconTrash className="size-3.5" />
			</Button>
		</div>
	);
}

function AuthorFields({
	author,
	index,
	isDragOverlay,
	updateAuthor,
}: {
	author: Author;
	index: number;
	isDragOverlay: boolean;
	updateAuthor: (index: number, updates: Partial<Author>) => void;
}) {
	return (
		<div className="p-4 space-y-3">
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
				<div className="space-y-1.5">
					<Label
						className="text-xs text-muted-foreground"
						htmlFor={`author-${index}-firstName`}
					>
						First name
					</Label>
					<Input
						className="h-9 text-sm text-foreground"
						disabled={isDragOverlay}
						id={`author-${index}-firstName`}
						onChange={(e) => updateAuthor(index, { firstName: e.target.value })}
						required
						type="text"
						value={author.firstName}
					/>
				</div>

				<div className="space-y-1.5">
					<Label
						className="text-xs text-muted-foreground"
						htmlFor={`author-${index}-lastName`}
					>
						Last name
					</Label>
					<Input
						className="h-9 text-sm text-foreground"
						disabled={isDragOverlay}
						id={`author-${index}-lastName`}
						onChange={(e) => updateAuthor(index, { lastName: e.target.value })}
						required
						type="text"
						value={author.lastName}
					/>
				</div>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
				<div className="space-y-1.5">
					<Label
						className="text-xs text-muted-foreground"
						htmlFor={`author-${index}-email`}
					>
						Email
					</Label>
					<Input
						className="h-9 text-sm text-foreground"
						disabled={isDragOverlay}
						id={`author-${index}-email`}
						onChange={(e) => updateAuthor(index, { email: e.target.value })}
						required
						type="email"
						value={author.email}
					/>
				</div>

				<div className="space-y-1.5">
					<Label className="text-xs text-muted-foreground">Affiliation</Label>
					{isDragOverlay ? (
						<div className="h-9 flex items-center px-3 rounded-md border bg-background text-sm text-foreground">
							{affiliationDisplay(author.affiliationName)}
						</div>
					) : (
						<AffiliationSelect
							displayValue={author.affiliationName}
							initValueId={author.affiliationId}
							onChange={(id, name) =>
								updateAuthor(index, {
									affiliationId: id,
									affiliationName: name,
								})
							}
							value={author.affiliationId}
						/>
					)}
				</div>
			</div>
		</div>
	);
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

	return (
		<div
			className={authorCardClassName({
				isPresenter: author.isPresenter,
				isDragging,
				isDragOverlay,
			})}
			data-testid={`author-card-${index}`}
			ref={isDragOverlay ? undefined : setNodeRef}
			style={style}
		>
			<AuthorCardHeader
				canRemove={canRemove}
				handle={{ attributes, listeners }}
				index={index}
				isDragOverlay={isDragOverlay}
				isPresenter={author.isPresenter}
				removeAuthor={removeAuthor}
				setPresenter={setPresenter}
			/>
			<AuthorFields
				author={author}
				index={index}
				isDragOverlay={isDragOverlay}
				updateAuthor={updateAuthor}
			/>
		</div>
	);
}

export function AuthorsInput({
	value,
	onChange,
	className,
}: AuthorsInputProps) {
	const [activeId, setActiveId] = useState<string | null>(null);
	const [itemIds, setItemIds] = useState<string[]>(() =>
		value.map(() => crypto.randomUUID()),
	);
	let ids = itemIds;
	if (ids.length !== value.length) {
		ids =
			ids.length < value.length
				? [
						...ids,
						...Array.from({ length: value.length - ids.length }, () =>
							crypto.randomUUID(),
						),
					]
				: ids.slice(0, value.length);
		setItemIds(ids);
	}
	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	const addAuthor = () => {
		const newAuthor: Author = {
			firstName: "",
			lastName: "",
			email: "",
			affiliationId: null,
			affiliationName: "",
			isPresenter: value.length === 0,
		};

		onChange([...value, newAuthor]);
	};

	const removeAuthor = (index: number) => {
		const newAuthors = value.filter((_, i) => i !== index);

		if (value[index].isPresenter && newAuthors.length > 0) {
			newAuthors[0].isPresenter = true;
		}

		setItemIds((prev) => prev.filter((_, i) => i !== index));
		onChange(newAuthors);
	};

	const updateAuthor = (index: number, updates: Partial<Author>) => {
		const newAuthors = [...value];
		newAuthors[index] = { ...newAuthors[index], ...updates };
		onChange(newAuthors);
	};

	const setPresenter = (index: number) => {
		const newAuthors = value.map((author, i) => ({
			...author,
			isPresenter: i === index,
		}));
		onChange(newAuthors);
	};

	const handleDragStart = (event: DragStartEvent) => {
		setActiveId(event.active.id.toString());
	};

	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;

		if (over && active.id !== over.id) {
			const oldIndex = Number(active.id);
			const newIndex = Number(over.id);
			setItemIds((prev) => arrayMove(prev, oldIndex, newIndex));
			onChange(arrayMove(value, oldIndex, newIndex));
		}

		setActiveId(null);
	};

	const handleDragCancel = () => {
		setActiveId(null);
	};

	const activeIndex = activeId !== null ? Number(activeId) : -1;
	const activeAuthor = activeIndex >= 0 ? value[activeIndex] : null;

	return (
		<div className={cn("space-y-3", className)}>
			<DndContext
				collisionDetection={closestCenter}
				onDragCancel={handleDragCancel}
				onDragEnd={handleDragEnd}
				onDragStart={handleDragStart}
				sensors={sensors}
			>
				<SortableContext
					items={value.map((_, index) => index.toString())}
					strategy={verticalListSortingStrategy}
				>
					{value.map((author, index) => (
						<SortableAuthorItem
							author={author}
							canRemove={value.length > 1}
							index={index}
							key={ids[index]}
							removeAuthor={removeAuthor}
							setPresenter={setPresenter}
							updateAuthor={updateAuthor}
						/>
					))}
				</SortableContext>
				<DragOverlay dropAnimation={null}>
					{activeAuthor && (
						<SortableAuthorItem
							author={activeAuthor}
							canRemove={value.length > 1}
							index={activeIndex}
							isDragOverlay
							removeAuthor={removeAuthor}
							setPresenter={setPresenter}
							updateAuthor={updateAuthor}
						/>
					)}
				</DragOverlay>
			</DndContext>

			<button
				className={cn(
					"w-full flex items-center justify-center gap-2 py-3 rounded-lg",
					"border border-dashed border-border/50",
					"text-xs font-medium text-muted-foreground",
					"hover:border-primary hover:text-primary hover:bg-primary/5",
					"transition-all",
				)}
				onClick={addAuthor}
				type="button"
			>
				<IconPlus className="size-3.5" />
				Add Author
			</button>
		</div>
	);
}
