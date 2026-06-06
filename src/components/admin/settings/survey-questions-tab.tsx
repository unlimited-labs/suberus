import {
	IconArrowDown,
	IconArrowUp,
	IconClipboardList,
	IconLoader2,
	IconPencil,
	IconPlus,
	IconTrash,
} from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { SettingsSection } from "@/components/settings/settings-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { SurveyQuestionType } from "@/generated/prisma/enums";
import {
	activeSurveyQuestionsQueryOptions,
	adminSurveyQuestionsQueryOptions,
	createSurveyQuestionFn,
	deleteSurveyQuestionFn,
	reorderSurveyQuestionsFn,
	updateSurveyQuestionFn,
} from "@/server-fns/settings/survey";
import {
	SurveyQuestionDialog,
	type SurveyQuestionFormValues,
} from "./survey-question-dialog";
import {
	isSelectType,
	OptionsEditor,
	ShowInListFields,
	type SurveyQuestion,
	TYPE_LABELS,
	TypeSelect,
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
			{/* Reorder arrows */}
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

			{/* Label + badges */}
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

			{/* Actions */}
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
	const [newLabel, setNewLabel] = useState("");
	const [newType, setNewType] = useState<SurveyQuestionType>("CHECKBOX");
	const [newRequired, setNewRequired] = useState(false);
	const [newOptions, setNewOptions] = useState<string[]>([]);
	const [newShowInList, setNewShowInList] = useState(false);
	const [newFieldName, setNewFieldName] = useState("");
	const [isAdding, setIsAdding] = useState(false);
	const [editing, setEditing] = useState<SurveyQuestion | null>(null);
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

	const handleAdd = async () => {
		if (!newLabel.trim()) return;
		if (
			isSelectType(newType) &&
			newOptions.filter((o) => o.trim()).length < 2
		) {
			toast.error("Select questions require at least 2 options");
			return;
		}
		if (newShowInList && !newFieldName.trim()) {
			toast.error("Field name is required to show in users list");
			return;
		}
		setIsAdding(true);
		try {
			const cleanOptions = isSelectType(newType)
				? newOptions.filter((o) => o.trim()).map((o) => o.trim())
				: undefined;
			const created = await createSurveyQuestionFn({
				data: {
					label: newLabel.trim(),
					orderIndex: questions.length,
					type: newType,
					isRequired: newRequired,
					showInUsersList: newShowInList,
					fieldName: newShowInList ? newFieldName.trim() : null,
					...(cleanOptions && { options: cleanOptions }),
				},
			});
			setQuestions((prev) => [...prev, created]);
			await invalidateSurvey();
			setNewLabel("");
			setNewType("CHECKBOX");
			setNewRequired(false);
			setNewOptions([]);
			setNewShowInList(false);
			setNewFieldName("");
			toast.success("Question added");
		} catch {
			toast.error("Failed to add question");
		} finally {
			setIsAdding(false);
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

	const handleEditSubmit = async (values: SurveyQuestionFormValues) => {
		if (!editing) return;
		const id = editing.id;
		setBusyId(id);
		try {
			const cleanOptions = isSelectType(values.type)
				? values.options.filter((o) => o.trim()).map((o) => o.trim())
				: null;
			const cleanFieldName = values.showInUsersList
				? values.fieldName.trim()
				: null;
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
		} catch {
			toast.error("Failed to update question");
		} finally {
			setBusyId(null);
		}
	};

	const handleDelete = async (id: string) => {
		setBusyId(id);
		try {
			await deleteSurveyQuestionFn({ data: { id } });
			await invalidateSurvey();
			setQuestions((prev) => prev.filter((q) => q.id !== id));
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
					{/* Question list */}
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
									onDelete={() => handleDelete(question.id)}
								/>
							))}
						</div>
					)}

					{/* Add new question */}
					<div
						data-testid="add-question-section"
						className="space-y-2 rounded-lg border border-dashed border-border bg-muted/10 p-4"
					>
						<p className="text-sm font-medium text-muted-foreground">
							New Question
						</p>
						<div className="flex gap-2">
							<Input
								placeholder="New question label..."
								value={newLabel}
								onChange={(e) => setNewLabel(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter" && !isSelectType(newType)) handleAdd();
								}}
								className="h-9"
							/>
						</div>
						<div className="flex flex-wrap items-center gap-2">
							<TypeSelect
								value={newType}
								onChange={setNewType}
								className="h-8 w-[160px]"
							/>
							<div className="flex items-center gap-1.5">
								<Switch
									id="new-required"
									checked={newRequired}
									onCheckedChange={setNewRequired}
								/>
								<Label htmlFor="new-required" className="text-xs">
									Required
								</Label>
							</div>
							<Button
								onClick={handleAdd}
								disabled={isAdding || !newLabel.trim()}
							>
								{isAdding ? (
									<IconLoader2 className="mr-2 size-4 animate-spin" />
								) : (
									<IconPlus className="mr-2 size-4" />
								)}
								Add
							</Button>
						</div>
						{isSelectType(newType) && (
							<OptionsEditor options={newOptions} onChange={setNewOptions} />
						)}
						<ShowInListFields
							idPrefix="new"
							showInList={newShowInList}
							fieldName={newFieldName}
							onShowInListChange={setNewShowInList}
							onFieldNameChange={setNewFieldName}
						/>
					</div>
				</div>
			</SettingsSection>

			<SurveyQuestionDialog
				question={editing}
				open={editing !== null}
				onOpenChange={(open) => {
					if (!open) setEditing(null);
				}}
				onSubmit={handleEditSubmit}
				isBusy={busyId === editing?.id}
			/>
		</div>
	);
}
