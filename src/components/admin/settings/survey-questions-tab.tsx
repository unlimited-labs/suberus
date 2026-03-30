import {
	IconArrowDown,
	IconArrowUp,
	IconClipboardList,
	IconLoader2,
	IconPlus,
	IconTrash,
	IconX,
} from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { SettingsSection } from "@/components/settings/settings-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { SurveyQuestionType } from "@/generated/prisma/enums";
import {
	activeSurveyQuestionsQueryOptions,
	adminSurveyQuestionsQueryOptions,
	createSurveyQuestionFn,
	deleteSurveyQuestionFn,
	reorderSurveyQuestionsFn,
	updateSurveyQuestionFn,
} from "@/utils/survey.functions";

interface SurveyQuestion {
	id: string;
	label: string;
	type: SurveyQuestionType;
	options: string[] | null;
	isRequired: boolean;
	orderIndex: number;
	isActive: boolean;
}

interface SurveyQuestionsTabProps {
	initialQuestions: SurveyQuestion[];
}

const TYPE_LABELS: Record<SurveyQuestionType, string> = {
	CHECKBOX: "Checkbox",
	TEXT: "Text",
	SINGLE_SELECT: "Single",
	MULTI_SELECT: "Multi",
};

const isSelectType = (type: SurveyQuestionType) =>
	type === "SINGLE_SELECT" || type === "MULTI_SELECT";

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
	const [isAdding, setIsAdding] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editLabel, setEditLabel] = useState("");
	const [editType, setEditType] = useState<SurveyQuestionType>("CHECKBOX");
	const [editRequired, setEditRequired] = useState(false);
	const [editOptions, setEditOptions] = useState<string[]>([]);
	const [busyId, setBusyId] = useState<string | null>(null);

	const handleAdd = async () => {
		if (!newLabel.trim()) return;
		if (
			isSelectType(newType) &&
			newOptions.filter((o) => o.trim()).length < 2
		) {
			toast.error("Select questions require at least 2 options");
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
					...(cleanOptions && { options: cleanOptions }),
				},
			});
			setQuestions((prev) => [...prev, created]);
			await Promise.all([
				queryClient.invalidateQueries({
					queryKey: adminSurveyQuestionsQueryOptions().queryKey,
				}),
				queryClient.invalidateQueries({
					queryKey: activeSurveyQuestionsQueryOptions().queryKey,
				}),
			]);
			setNewLabel("");
			setNewType("CHECKBOX");
			setNewRequired(false);
			setNewOptions([]);
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

	const handleStartEdit = (q: SurveyQuestion) => {
		setEditingId(q.id);
		setEditLabel(q.label);
		setEditType(q.type);
		setEditRequired(q.isRequired);
		setEditOptions(Array.isArray(q.options) ? (q.options as string[]) : []);
	};

	const handleSaveEdit = async (id: string) => {
		if (!editLabel.trim()) return;
		if (
			isSelectType(editType) &&
			editOptions.filter((o) => o.trim()).length < 2
		) {
			toast.error("Select questions require at least 2 options");
			return;
		}
		setBusyId(id);
		try {
			const cleanOptions = isSelectType(editType)
				? editOptions.filter((o) => o.trim()).map((o) => o.trim())
				: null;
			await updateSurveyQuestionFn({
				data: {
					id,
					label: editLabel.trim(),
					type: editType,
					isRequired: editRequired,
					options: cleanOptions,
				},
			});
			setQuestions((prev) =>
				prev.map((q) =>
					q.id === id
						? {
								...q,
								label: editLabel.trim(),
								type: editType,
								isRequired: editRequired,
								options: cleanOptions,
							}
						: q,
				),
			);
			await Promise.all([
				queryClient.invalidateQueries({
					queryKey: adminSurveyQuestionsQueryOptions().queryKey,
				}),
				queryClient.invalidateQueries({
					queryKey: activeSurveyQuestionsQueryOptions().queryKey,
				}),
			]);
			setEditingId(null);
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
			await Promise.all([
				queryClient.invalidateQueries({
					queryKey: adminSurveyQuestionsQueryOptions().queryKey,
				}),
				queryClient.invalidateQueries({
					queryKey: activeSurveyQuestionsQueryOptions().queryKey,
				}),
			]);
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
								<div
									key={question.id}
									data-testid="question-row"
									className="rounded-lg border border-border/50 bg-muted/20 p-3"
								>
									<div className="flex items-start gap-2">
										{/* Reorder arrows */}
										<div className="flex flex-col gap-0.5">
											<Button
												variant="ghost"
												size="icon-sm"
												disabled={index === 0 || busyId === question.id}
												onClick={() => handleMove(index, "up")}
												aria-label="Move up"
											>
												<IconArrowUp className="size-3.5" />
											</Button>
											<Button
												variant="ghost"
												size="icon-sm"
												disabled={
													index === questions.length - 1 ||
													busyId === question.id
												}
												onClick={() => handleMove(index, "down")}
												aria-label="Move down"
											>
												<IconArrowDown className="size-3.5" />
											</Button>
										</div>

										{/* Label + badges (view mode) / Edit form */}
										<div className="min-w-0 flex-1">
											{editingId === question.id ? (
												<div className="space-y-2">
													<div className="flex gap-2">
														<Input
															value={editLabel}
															onChange={(e) => setEditLabel(e.target.value)}
															className="h-8 text-sm"
															onKeyDown={(e) => {
																if (e.key === "Escape") setEditingId(null);
															}}
														/>
													</div>
													<div className="flex flex-wrap items-center gap-2">
														<Select
															value={editType}
															onValueChange={(v) =>
																setEditType(v as SurveyQuestionType)
															}
														>
															<SelectTrigger className="h-8 w-[140px]">
																<SelectValue />
															</SelectTrigger>
															<SelectContent>
																<SelectItem value="CHECKBOX">
																	Checkbox
																</SelectItem>
																<SelectItem value="TEXT">Text</SelectItem>
																<SelectItem value="SINGLE_SELECT">
																	Single Select
																</SelectItem>
																<SelectItem value="MULTI_SELECT">
																	Multi Select
																</SelectItem>
															</SelectContent>
														</Select>
														<div className="flex items-center gap-1.5">
															<Switch
																id={`edit-required-${question.id}`}
																checked={editRequired}
																onCheckedChange={setEditRequired}
															/>
															<Label
																htmlFor={`edit-required-${question.id}`}
																className="text-xs"
															>
																Required
															</Label>
														</div>
													</div>
													{isSelectType(editType) && (
														<OptionsEditor
															options={editOptions}
															onChange={setEditOptions}
														/>
													)}
													<div className="flex gap-2">
														<Button
															size="sm"
															onClick={() => handleSaveEdit(question.id)}
															disabled={busyId === question.id}
														>
															Save
														</Button>
														<Button
															size="sm"
															variant="outline"
															onClick={() => setEditingId(null)}
														>
															Cancel
														</Button>
													</div>
												</div>
											) : (
												<div className="space-y-1">
													<button
														type="button"
														className="text-left text-sm font-medium hover:underline"
														onClick={() => handleStartEdit(question)}
													>
														{question.label}
													</button>
													<div className="flex flex-wrap items-center gap-1.5">
														<Badge variant="outline" className="text-[10px]">
															{TYPE_LABELS[question.type]}
														</Badge>
														{question.isRequired && (
															<Badge
																variant="secondary"
																className="text-[10px]"
															>
																Required
															</Badge>
														)}
													</div>
													{isSelectType(question.type) &&
														question.options &&
														question.options.length > 0 && (
															<p className="text-xs text-muted-foreground">
																Options: {question.options.join(", ")}
															</p>
														)}
												</div>
											)}
										</div>

										{/* Active toggle + Delete (hidden during edit) */}
										{editingId !== question.id && (
											<>
												<div className="flex items-center gap-2">
													<Label
														htmlFor={`active-${question.id}`}
														className="hidden text-xs text-muted-foreground sm:inline"
													>
														Active
													</Label>
													<Switch
														id={`active-${question.id}`}
														checked={question.isActive}
														onCheckedChange={(checked) =>
															handleToggleActive(question.id, checked)
														}
														disabled={busyId === question.id}
													/>
												</div>

												<Button
													variant="ghost"
													size="icon-sm"
													onClick={() => handleDelete(question.id)}
													disabled={busyId === question.id}
													className="text-destructive hover:text-destructive"
													aria-label="Delete question"
												>
													<IconTrash className="size-4" />
												</Button>
											</>
										)}
									</div>
								</div>
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
							<Select
								value={newType}
								onValueChange={(v) => setNewType(v as SurveyQuestionType)}
							>
								<SelectTrigger className="h-8 w-[160px]">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="CHECKBOX">Checkbox</SelectItem>
									<SelectItem value="TEXT">Text</SelectItem>
									<SelectItem value="SINGLE_SELECT">Single Select</SelectItem>
									<SelectItem value="MULTI_SELECT">Multi Select</SelectItem>
								</SelectContent>
							</Select>
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
					</div>
				</div>
			</SettingsSection>
		</div>
	);
}

function OptionsEditor({
	options,
	onChange,
}: {
	options: string[];
	onChange: (options: string[]) => void;
}) {
	return (
		<div className="space-y-1.5 rounded-md border border-border/50 bg-background p-3">
			<Label className="text-xs font-medium text-muted-foreground">
				Options
			</Label>
			{options.map((opt, i) => (
				<div key={opt} className="flex gap-1.5">
					<Input
						value={opt}
						onChange={(e) => {
							const next = [...options];
							next[i] = e.target.value;
							onChange(next);
						}}
						placeholder={`Option ${i + 1}`}
						className="h-8 text-sm"
					/>
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={() => onChange(options.filter((_, j) => j !== i))}
						aria-label="Remove option"
					>
						<IconX className="size-3.5" />
					</Button>
				</div>
			))}
			<Button
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
