import {
	IconArrowDown,
	IconArrowUp,
	IconClipboardList,
	IconLoader2,
	IconPlus,
	IconTrash,
} from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";
import { SettingsSection } from "@/components/settings/settings-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
	createSurveyQuestionFn,
	deleteSurveyQuestionFn,
	reorderSurveyQuestionsFn,
	updateSurveyQuestionFn,
} from "@/utils/survey.functions";

interface SurveyQuestion {
	id: string;
	label: string;
	orderIndex: number;
	isActive: boolean;
}

interface SurveyQuestionsTabProps {
	initialQuestions: SurveyQuestion[];
}

export function SurveyQuestionsTab({
	initialQuestions,
}: SurveyQuestionsTabProps) {
	const [questions, setQuestions] =
		useState<SurveyQuestion[]>(initialQuestions);
	const [newLabel, setNewLabel] = useState("");
	const [isAdding, setIsAdding] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editLabel, setEditLabel] = useState("");
	const [busyId, setBusyId] = useState<string | null>(null);

	const handleAdd = async () => {
		if (!newLabel.trim()) return;
		setIsAdding(true);
		try {
			const created = await createSurveyQuestionFn({
				data: { label: newLabel.trim(), orderIndex: questions.length },
			});
			setQuestions((prev) => [...prev, created]);
			setNewLabel("");
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
	};

	const handleSaveEdit = async (id: string) => {
		if (!editLabel.trim()) return;
		setBusyId(id);
		try {
			await updateSurveyQuestionFn({
				data: { id, label: editLabel.trim() },
			});
			setQuestions((prev) =>
				prev.map((q) => (q.id === id ? { ...q, label: editLabel.trim() } : q)),
			);
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
									className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/20 p-3"
								>
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
												index === questions.length - 1 || busyId === question.id
											}
											onClick={() => handleMove(index, "down")}
											aria-label="Move down"
										>
											<IconArrowDown className="size-3.5" />
										</Button>
									</div>

									{/* Label (editable) */}
									<div className="flex-1">
										{editingId === question.id ? (
											<div className="flex gap-2">
												<Input
													value={editLabel}
													onChange={(e) => setEditLabel(e.target.value)}
													className="h-8 text-sm"
													onKeyDown={(e) => {
														if (e.key === "Enter") handleSaveEdit(question.id);
														if (e.key === "Escape") setEditingId(null);
													}}
												/>
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
										) : (
											<button
												type="button"
												className="text-left text-sm hover:underline"
												onClick={() => handleStartEdit(question)}
											>
												{question.label}
											</button>
										)}
									</div>

									{/* Active toggle */}
									<div className="flex items-center gap-2">
										<Label
											htmlFor={`active-${question.id}`}
											className="text-xs text-muted-foreground"
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

									{/* Delete */}
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
								</div>
							))}
						</div>
					)}

					{/* Add new question */}
					<div className="flex gap-2">
						<Input
							placeholder="New question label..."
							value={newLabel}
							onChange={(e) => setNewLabel(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") handleAdd();
							}}
							className="h-9"
						/>
						<Button onClick={handleAdd} disabled={isAdding || !newLabel.trim()}>
							{isAdding ? (
								<IconLoader2 className="mr-2 size-4 animate-spin" />
							) : (
								<IconPlus className="mr-2 size-4" />
							)}
							Add
						</Button>
					</div>
				</div>
			</SettingsSection>
		</div>
	);
}
