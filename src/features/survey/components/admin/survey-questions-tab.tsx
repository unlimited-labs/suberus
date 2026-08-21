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
	IconClipboardList,
	IconGripVertical,
	IconPencil,
	IconPlus,
	IconTemplate,
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
	importSurveyTemplateFn,
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
	AUDIENCE_LABELS,
	isSelectType,
	type SurveyQuestion,
	TYPE_LABELS,
	TYPE_META,
} from "./survey-question-fields";
import { SurveyTemplateDialog } from "./survey-template-dialog";

interface SurveyQuestionsTabProps {
	initialQuestions: SurveyQuestion[];
	exhibitorsEnabled: boolean;
}

const trimOptions = (options: string[]) =>
	options.flatMap((option) => {
		const trimmed = option.trim();
		return trimmed ? [trimmed] : [];
	});

interface SurveyQuestionRowProps {
	question: SurveyQuestion;
	isBusy: boolean;
	exhibitorsEnabled: boolean;
	onEdit: () => void;
	onToggleActive: (active: boolean) => void;
	onDelete: () => void;
}

function SurveyQuestionRow({
	question,
	isBusy,
	exhibitorsEnabled,
	onEdit,
	onToggleActive,
	onDelete,
}: SurveyQuestionRowProps) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: question.id });
	const TypeIcon = TYPE_META[question.type].icon;

	return (
		<div
			className={cn(
				"flex items-center gap-3 rounded-lg border bg-card p-3",
				isDragging && "relative z-10 opacity-80 shadow-lg",
			)}
			data-testid="question-row"
			ref={setNodeRef}
			style={{ transform: CSS.Transform.toString(transform), transition }}
		>
			<button
				aria-label="Reorder question"
				className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
				type="button"
				{...attributes}
				{...listeners}
			>
				<IconGripVertical className="size-4" />
			</button>

			<div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
				<TypeIcon className="size-5" />
			</div>

			<button
				className="min-w-0 flex-1 text-left"
				onClick={onEdit}
				type="button"
			>
				<p className="truncate text-sm font-medium">{question.label}</p>
				<div className="mt-0.5 flex flex-wrap items-center gap-1.5">
					<Badge className="text-[10px]" variant="outline">
						{TYPE_LABELS[question.type]}
					</Badge>
					{question.isRequired && (
						<Badge className="text-[10px]" variant="secondary">
							Required
						</Badge>
					)}
					{question.showInUsersList && (
						<Badge className="text-[10px]" variant="secondary">
							In list: {question.fieldName ?? question.label}
						</Badge>
					)}
					{exhibitorsEnabled && question.audience !== "ALL" && (
						<Badge className="text-[10px]" variant="outline">
							{AUDIENCE_LABELS[question.audience]}
						</Badge>
					)}
				</div>
			</button>

			<Button
				aria-label="Edit question"
				disabled={isBusy}
				onClick={onEdit}
				size="icon-sm"
				variant="ghost"
			>
				<IconPencil className="size-4" />
			</Button>
			<div className="flex items-center gap-1.5">
				<Label
					className="hidden text-xs text-muted-foreground sm:inline"
					htmlFor={`active-${question.id}`}
				>
					Active
				</Label>
				<Switch
					checked={question.isActive}
					disabled={isBusy}
					id={`active-${question.id}`}
					onCheckedChange={onToggleActive}
				/>
			</div>
			<Button
				aria-label="Delete question"
				className="text-destructive hover:text-destructive"
				disabled={isBusy}
				onClick={onDelete}
				size="icon-sm"
				variant="ghost"
			>
				<IconTrash className="size-4" />
			</Button>
		</div>
	);
}

export function SurveyQuestionsTab({
	initialQuestions,
	exhibitorsEnabled,
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
	const [templateOpen, setTemplateOpen] = useState(false);
	const [importing, setImporting] = useState(false);

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
			? trimOptions(values.options)
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
					audience: values.audience,
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

	const handleImport = async (templateId: string) => {
		setImporting(true);
		try {
			const created = await importSurveyTemplateFn({ data: { templateId } });
			setQuestions((prev) => [...prev, ...created]);
			await invalidateSurvey();
			setTemplateOpen(false);
			toast.success("Template imported");
		} catch (error) {
			toast.error(getErrorMessage(error, "Failed to import template"));
		}
		setImporting(false);
	};

	const handleEditSave = async (
		question: SurveyQuestion,
		values: SurveyQuestionFormValues,
	) => {
		const id = question.id;
		const cleanOptions = isSelectType(values.type)
			? trimOptions(values.options)
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
					audience: values.audience,
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
								audience: values.audience,
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
		}
		setBusyId(null);
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
		}
		setBusyId(null);
	};

	const handleDragEnd = async (event: DragEndEvent) => {
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

	return (
		<div className="space-y-6">
			<SettingsSection
				description="Configure questions shown to users during registration and in their settings"
				icon={IconClipboardList}
				title="Survey Questions"
			>
				<div className="space-y-4">
					{questions.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							No survey questions configured.
						</p>
					) : (
						<DndContext
							collisionDetection={closestCenter}
							onDragEnd={handleDragEnd}
							sensors={sensors}
						>
							<SortableContext
								items={questions.map((q) => q.id)}
								strategy={verticalListSortingStrategy}
							>
								<div className="space-y-2">
									{questions.map((question) => (
										<SurveyQuestionRow
											exhibitorsEnabled={exhibitorsEnabled}
											isBusy={busyId === question.id}
											key={question.id}
											onDelete={() => setDeleting(question)}
											onEdit={() => setDialog({ question })}
											onToggleActive={(active) =>
												handleToggleActive(question.id, active)
											}
											question={question}
										/>
									))}
								</div>
							</SortableContext>
						</DndContext>
					)}

					<div className="flex flex-col gap-2 sm:flex-row">
						<button
							className={cn(
								"flex flex-1 items-center justify-center gap-2 rounded-lg py-3",
								"border border-dashed border-border/60 text-sm font-medium text-muted-foreground",
								"transition-all hover:border-primary hover:bg-primary/5 hover:text-primary",
							)}
							data-testid="add-question-button"
							onClick={() => setDialog({ question: null })}
							type="button"
						>
							<IconPlus className="size-4" />
							Add question
						</button>
						<button
							className={cn(
								"flex flex-1 items-center justify-center gap-2 rounded-lg py-3",
								"border border-dashed border-border/60 text-sm font-medium text-muted-foreground",
								"transition-all hover:border-primary hover:bg-primary/5 hover:text-primary",
							)}
							data-testid="import-template-button"
							onClick={() => setTemplateOpen(true)}
							type="button"
						>
							<IconTemplate className="size-4" />
							Import template
						</button>
					</div>
				</div>
			</SettingsSection>

			<SurveyQuestionDialog
				exhibitorsEnabled={exhibitorsEnabled}
				onOpenChange={(open) => {
					if (!open) setDialog(null);
				}}
				onSave={(values) =>
					dialog?.question
						? handleEditSave(dialog.question, values)
						: handleCreate(values)
				}
				open={dialog !== null}
				question={dialog?.question ?? null}
			/>

			<SurveyTemplateDialog
				isBusy={importing}
				onImport={handleImport}
				onOpenChange={(open) => {
					if (!importing) setTemplateOpen(open);
				}}
				open={templateOpen}
			/>

			<SurveyQuestionDeleteDialog
				isBusy={busyId === deleting?.id}
				onConfirm={handleConfirmDelete}
				onOpenChange={(open) => {
					if (!open) setDeleting(null);
				}}
				open={deleting !== null}
				question={deleting}
			/>
		</div>
	);
}
