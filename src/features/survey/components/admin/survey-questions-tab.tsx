import {
	IconArrowDown,
	IconArrowUp,
	IconClipboardList,
	IconPencil,
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
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";
import { SurveyQuestionAddForm } from "./survey-question-add-form";
import { SurveyQuestionDeleteDialog } from "./survey-question-delete-dialog";
import { SurveyQuestionDialog } from "./survey-question-dialog";
import {
	isSelectType,
	type SurveyQuestion,
	TYPE_LABELS,
} from "./survey-question-fields";

interface SurveyQuestionsTabProps {
	initialQuestions: SurveyQuestion[];
}

interface SurveyQuestionRowProps {
	question: SurveyQuestion;
	index: number;
	total: number;
	isBusy: boolean;
	onMove: (dir: "up" | "down") => void;
	onEdit: () => void;
	onToggleActive: (active: boolean) => void;
	onDelete: () => void;
}

function SurveyQuestionRow({
	question,
	index,
	total,
	isBusy,
	onMove,
	onEdit,
	onToggleActive,
	onDelete,
}: SurveyQuestionRowProps) {
	return (
		<div
			data-testid="question-row"
			className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/20 p-2.5"
		>
			<div className="flex flex-col">
				<Button
					variant="ghost"
					size="icon-sm"
					disabled={index === 0 || isBusy}
					onClick={() => onMove("up")}
					aria-label="Move up"
				>
					<IconArrowUp className="size-3.5" />
				</Button>
				<Button
					variant="ghost"
					size="icon-sm"
					disabled={index === total - 1 || isBusy}
					onClick={() => onMove("down")}
					aria-label="Move down"
				>
					<IconArrowDown className="size-3.5" />
				</Button>
			</div>

			<button
				type="button"
				onClick={onEdit}
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
				onClick={onEdit}
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
				onClick={onDelete}
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
	const [editing, setEditing] = useState<SurveyQuestion | null>(null);
	const [deleting, setDeleting] = useState<SurveyQuestion | null>(null);
	const [busyId, setBusyId] = useState<string | null>(null);

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
					isRequired: values.isRequired,
					showInUsersList: values.showInUsersList,
					fieldName: values.showInUsersList ? values.fieldName.trim() : null,
					...(cleanOptions && { options: cleanOptions }),
				},
			});
			setQuestions((prev) => [...prev, created]);
			await invalidateSurvey();
			toast.success("Question added");
		} catch (error) {
			toast.error(getErrorMessage(error, "Failed to add question"));
			throw new Error("create failed");
		}
	};

	const handleEditSave = async (values: SurveyQuestionFormValues) => {
		if (!editing) return;
		const id = editing.id;
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
								isRequired: values.isRequired,
								options: cleanOptions,
								showInUsersList: values.showInUsersList,
								fieldName: cleanFieldName,
							}
						: q,
				),
			);
			await invalidateSurvey();
			setEditing(null);
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

	const handleMove = async (index: number, direction: "up" | "down") => {
		const newIndex = direction === "up" ? index - 1 : index + 1;
		if (newIndex < 0 || newIndex >= questions.length) return;

		const reordered = [...questions];
		[reordered[index], reordered[newIndex]] = [
			reordered[newIndex],
			reordered[index],
		];

		setQuestions(reordered);

		try {
			await reorderSurveyQuestionsFn({
				data: { orderedIds: reordered.map((q) => q.id) },
			});
			await queryClient.invalidateQueries({
				queryKey: adminSurveyQuestionsQueryOptions().queryKey,
			});
		} catch {
			setQuestions(questions);
			toast.error("Failed to reorder questions");
		}
	};

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
						<div className="space-y-2">
							{questions.map((question, index) => (
								<SurveyQuestionRow
									key={question.id}
									question={question}
									index={index}
									total={questions.length}
									isBusy={busyId === question.id}
									onMove={(dir) => handleMove(index, dir)}
									onEdit={() => setEditing(question)}
									onToggleActive={(active) =>
										handleToggleActive(question.id, active)
									}
									onDelete={() => setDeleting(question)}
								/>
							))}
						</div>
					)}

					<SurveyQuestionAddForm onCreate={handleCreate} />
				</div>
			</SettingsSection>

			<SurveyQuestionDialog
				question={editing}
				open={editing !== null}
				onOpenChange={(open) => {
					if (!open) setEditing(null);
				}}
				onSave={handleEditSave}
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
