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
	IconClipboardList,
	IconGripVertical,
	IconPencil,
	IconPlus,
	IconTrash,
} from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { SettingsSection } from "@/features/settings/components/settings-section";
import {
	activeSurveyQuestionsQueryOptions,
	adminSurveyQuestionsQueryOptions,
	createSurveyQuestionFn,
	deleteSurveyQuestionFn,
	reorderSurveyQuestionsFn,
	updateSurveyQuestionFn,
} from "@/features/survey/api/survey";
import type { SurveyQuestionFormValues } from "@/features/survey/validations";
import { getErrorMessage } from "@/shared/lib/error-message";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";
import { SurveyQuestionDeleteDialog } from "./survey-question-delete-dialog";
import { SurveyQuestionDialog } from "./survey-question-dialog";
import {
	isSelectType,
	type SurveyQuestion,
	TYPE_LABELS,
	TYPE_META,
} from "./survey-question-fields";

interface SurveyQuestionsTabProps {
	initialQuestions: SurveyQuestion[];
}

interface SurveyQuestionRowProps {
	question: SurveyQuestion;
	isBusy: boolean;
	onEdit: () => void;
	onToggleActive: (active: boolean) => void;
	onDelete: () => void;
	isDragOverlay?: boolean;
}

function SurveyQuestionRow({
	question,
	isBusy,
	onEdit,
	onToggleActive,
	onDelete,
	isDragOverlay = false,
}: SurveyQuestionRowProps) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: question.id, animateLayoutChanges: () => false });
	const TypeIcon = TYPE_META[question.type].icon;

	return (
		<div
			ref={isDragOverlay ? undefined : setNodeRef}
			style={
				isDragOverlay
					? undefined
					: { transform: CSS.Transform.toString(transform), transition }
			}
			data-testid="question-row"
			className={cn(
				"flex items-center gap-3 rounded-lg border bg-card p-3",
				isDragging && "opacity-50",
				isDragOverlay && "shadow-lg",
			)}
		>
			<button
				type="button"
				className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
				aria-label="Reorder question"
				{...(isDragOverlay ? {} : attributes)}
				{...(isDragOverlay ? {} : listeners)}
			>
				<IconGripVertical className="size-4" />
			</button>

			<div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
				<TypeIcon className="size-5" />
			</div>

			<button
				type="button"
				onClick={() => !isDragOverlay && onEdit()}
				className="min-w-0 flex-1 text-left"
			>
				<p className="truncate text-sm font-medium">{question.label}</p>
				<div className="mt-0.5 flex flex-wrap items-center gap-1.5">
					<Badge variant="outline" className="text-[10px]">
						{TYPE_LABELS[question.type]}
					</Badge>
					{question.isRequired && (
						<Badge variant="secondary" className="text-[10px]">
							Required
						</Badge>
					)}
					{question.showInUsersList && (
						<Badge variant="secondary" className="text-[10px]">
							In list: {question.fieldName ?? question.label}
						</Badge>
					)}
				</div>
			</button>

			<Button
				variant="ghost"
				size="icon-sm"
				onClick={() => !isDragOverlay && onEdit()}
				disabled={isBusy}
				aria-label="Edit question"
			>
				<IconPencil className="size-4" />
			</Button>
			<div className="flex items-center gap-1.5">
				<Label
					htmlFor={`active-${question.id}`}
					className="hidden text-xs text-muted-foreground sm:inline"
				>
					Active
				</Label>
				<Switch
					id={`active-${question.id}`}
					checked={question.isActive}
					onCheckedChange={onToggleActive}
					disabled={isBusy}
				/>
			</div>
			<Button
				variant="ghost"
				size="icon-sm"
				onClick={() => !isDragOverlay && onDelete()}
				disabled={isBusy}
				className="text-destructive hover:text-destructive"
				aria-label="Delete question"
			>
				<IconTrash className="size-4" />
			</Button>
		</div>
	);
}

export function SurveyQuestionsTab({
	initialQuestions,
}: SurveyQuestionsTabProps) {
	const queryClient = useQueryClient();
	const [questions, setQuestions] =
		useState<SurveyQuestion[]>(initialQuestions);
	// null = closed; { question: null } = add; { question } = edit.
	const [dialog, setDialog] = useState<{
		question: SurveyQuestion | null;
	} | null>(null);
	const [deleting, setDeleting] = useState<SurveyQuestion | null>(null);
	const [busyId, setBusyId] = useState<string | null>(null);
	const [activeId, setActiveId] = useState<string | null>(null);

	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	const invalidateSurvey = () =>
		Promise.all([
			queryClient.invalidateQueries({
				queryKey: adminSurveyQuestionsQueryOptions().queryKey,
			}),
			queryClient.invalidateQueries({
				queryKey: activeSurveyQuestionsQueryOptions().queryKey,
			}),
		]);

	const handleCreate = async (values: SurveyQuestionFormValues) => {
		const cleanOptions = isSelectType(values.type)
			? values.options.filter((o) => o.trim()).map((o) => o.trim())
			: undefined;
		try {
			const created = await createSurveyQuestionFn({
				data: {
					label: values.label.trim(),
					orderIndex: questions.length,
					type: values.type,
					allowOther: isSelectType(values.type) && values.allowOther,
					isRequired: values.isRequired,
					showInUsersList: values.showInUsersList,
					fieldName: values.showInUsersList ? values.fieldName.trim() : null,
					...(cleanOptions && { options: cleanOptions }),
				},
			});
			setQuestions((prev) => [...prev, created]);
			await invalidateSurvey();
			setDialog(null);
			toast.success("Question added");
		} catch (error) {
			toast.error(getErrorMessage(error, "Failed to add question"));
			throw new Error("create failed");
		}
	};

	const handleEditSave = async (
		question: SurveyQuestion,
		values: SurveyQuestionFormValues,
	) => {
		const id = question.id;
		const cleanOptions = isSelectType(values.type)
			? values.options.filter((o) => o.trim()).map((o) => o.trim())
			: null;
		const cleanFieldName = values.showInUsersList
			? values.fieldName.trim()
			: null;
		try {
			await updateSurveyQuestionFn({
				data: {
					id,
					label: values.label.trim(),
					type: values.type,
					allowOther: isSelectType(values.type) && values.allowOther,
					isRequired: values.isRequired,
					options: cleanOptions,
					showInUsersList: values.showInUsersList,
					fieldName: cleanFieldName,
				},
			});
			setQuestions((prev) =>
				prev.map((q) =>
					q.id === id
						? {
								...q,
								label: values.label.trim(),
								type: values.type,
								allowOther: isSelectType(values.type) && values.allowOther,
								isRequired: values.isRequired,
								options: cleanOptions,
								showInUsersList: values.showInUsersList,
								fieldName: cleanFieldName,
							}
						: q,
				),
			);
			await invalidateSurvey();
			setDialog(null);
			toast.success("Question updated");
		} catch (error) {
			toast.error(getErrorMessage(error, "Failed to update question"));
			throw new Error("update failed");
		}
	};

	const handleToggleActive = async (id: string, isActive: boolean) => {
		setBusyId(id);
		try {
			await updateSurveyQuestionFn({ data: { id, isActive } });
			await queryClient.invalidateQueries({
				queryKey: activeSurveyQuestionsQueryOptions().queryKey,
			});
			setQuestions((prev) =>
				prev.map((q) => (q.id === id ? { ...q, isActive } : q)),
			);
		} catch {
			toast.error("Failed to update question");
		} finally {
			setBusyId(null);
		}
	};

	const handleConfirmDelete = async () => {
		if (!deleting) return;
		const id = deleting.id;
		setBusyId(id);
		try {
			await deleteSurveyQuestionFn({ data: { id } });
			await invalidateSurvey();
			setQuestions((prev) => prev.filter((q) => q.id !== id));
			setDeleting(null);
			toast.success("Question deleted");
		} catch {
			toast.error("Failed to delete question");
		} finally {
			setBusyId(null);
		}
	};

	const handleDragEnd = async (event: DragEndEvent) => {
		setActiveId(null);
		const { active, over } = event;
		if (!over || active.id === over.id) return;

		const oldIndex = questions.findIndex((q) => q.id === active.id);
		const newIndex = questions.findIndex((q) => q.id === over.id);
		if (oldIndex === -1 || newIndex === -1) return;

		const previous = questions;
		const reordered = arrayMove(questions, oldIndex, newIndex);
		setQuestions(reordered);

		try {
			await reorderSurveyQuestionsFn({
				data: { orderedIds: reordered.map((q) => q.id) },
			});
			await queryClient.invalidateQueries({
				queryKey: adminSurveyQuestionsQueryOptions().queryKey,
			});
		} catch {
			setQuestions(previous);
			toast.error("Failed to reorder questions");
		}
	};

	const handleDragStart = (event: DragStartEvent) =>
		setActiveId(event.active.id.toString());

	const activeQuestion = questions.find((q) => q.id === activeId) ?? null;

	return (
		<div className="space-y-6">
			<SettingsSection
				icon={IconClipboardList}
				title="Survey Questions"
				description="Configure questions shown to users during registration and in their settings"
			>
				<div className="space-y-4">
					{questions.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							No survey questions configured.
						</p>
					) : (
						<DndContext
							sensors={sensors}
							collisionDetection={closestCenter}
							onDragStart={handleDragStart}
							onDragEnd={handleDragEnd}
							onDragCancel={() => setActiveId(null)}
						>
							<SortableContext
								items={questions.map((q) => q.id)}
								strategy={verticalListSortingStrategy}
							>
								<div className="space-y-2">
									{questions.map((question) => (
										<SurveyQuestionRow
											key={question.id}
											question={question}
											isBusy={busyId === question.id}
											onEdit={() => setDialog({ question })}
											onToggleActive={(active) =>
												handleToggleActive(question.id, active)
											}
											onDelete={() => setDeleting(question)}
										/>
									))}
								</div>
							</SortableContext>
							<DragOverlay dropAnimation={null}>
								{activeQuestion && (
									<SurveyQuestionRow
										question={activeQuestion}
										isBusy={false}
										onEdit={() => {}}
										onToggleActive={() => {}}
										onDelete={() => {}}
										isDragOverlay
									/>
								)}
							</DragOverlay>
						</DndContext>
					)}

					<button
						type="button"
						data-testid="add-question-button"
						onClick={() => setDialog({ question: null })}
						className={cn(
							"flex w-full items-center justify-center gap-2 rounded-lg py-3",
							"border border-dashed border-border/60 text-sm font-medium text-muted-foreground",
							"transition-all hover:border-primary hover:bg-primary/5 hover:text-primary",
						)}
					>
						<IconPlus className="size-4" />
						Add question
					</button>
				</div>
			</SettingsSection>

			<SurveyQuestionDialog
				question={dialog?.question ?? null}
				open={dialog !== null}
				onOpenChange={(open) => {
					if (!open) setDialog(null);
				}}
				onSave={(values) =>
					dialog?.question
						? handleEditSave(dialog.question, values)
						: handleCreate(values)
				}
			/>

			<SurveyQuestionDeleteDialog
				question={deleting}
				open={deleting !== null}
				onOpenChange={(open) => {
					if (!open) setDeleting(null);
				}}
				onConfirm={handleConfirmDelete}
				isBusy={busyId === deleting?.id}
			/>
		</div>
	);
}
