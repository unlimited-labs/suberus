import {
	IconCategory,
	IconCircle,
	IconCircleCheck,
	IconFileText,
	IconInfoCircle,
	IconSend,
	IconSparkles,
	IconTags,
	IconUsers,
	IconWriting,
} from "@tabler/icons-react";
import { useForm } from "@tanstack/react-form";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/hooks/use-session";
import { cn } from "@/lib/utils";
import { type Author, AuthorsInput } from "./authors-input";
import { FileDropzone } from "./file-dropzone";
import { KeywordsInput } from "./keywords-input";

const submissionTypeOptions = [
	{ value: "ABSTRACT", label: "Abstract", icon: IconFileText },
	{ value: "POSTER", label: "Poster", icon: IconSparkles },
] as const;

interface SubmissionFormProps {
	onSubmit: (data: SubmissionFormData) => Promise<void>;
	initialData?: Partial<SubmissionFormData>;
}

export interface SubmissionFormData {
	type: "ABSTRACT" | "POSTER";
	title: string;
	content: string;
	authors: Author[];
	keywords: string[];
	file: File | null;
}

export function SubmissionForm({ onSubmit, initialData }: SubmissionFormProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const { user } = useSession();
	const hasAutoFilledRef = useRef(false);

	const form = useForm({
		defaultValues: {
			type: initialData?.type || "ABSTRACT",
			title: initialData?.title || "",
			content: initialData?.content || "",
			authors: initialData?.authors || [
				{
					firstName: "",
					lastName: "",
					email: "",
					affiliationId: null,
					affiliationName: "",
					isPresenter: true,
				},
			],
			keywords: initialData?.keywords || [],
			file: initialData?.file || null,
		} satisfies SubmissionFormData,
		onSubmit: async ({ value }) => {
			setIsSubmitting(true);
			try {
				await onSubmit(value);
			} finally {
				setIsSubmitting(false);
			}
		},
	});

	// Auto-fill first author with user data (only for new submissions)
	useEffect(() => {
		if (hasAutoFilledRef.current || initialData?.authors) return;
		if (!user) return;

		const authors = form.state.values.authors;
		const firstAuthor = authors[0];
		const isEmpty =
			!firstAuthor?.firstName && !firstAuthor?.lastName && !firstAuthor?.email;

		if (isEmpty) {
			form.setFieldValue("authors", [
				{
					firstName: user.firstName ?? "",
					lastName: user.lastName ?? "",
					email: user.email ?? "",
					affiliationId: user.affiliationId ?? null,
					affiliationName: "", // AffiliationSelect will fetch name via initValueId
					isPresenter: true,
				},
				...authors.slice(1),
			]);
			hasAutoFilledRef.current = true;
		}
	}, [user, initialData?.authors, form]);

	const values = form.state.values;

	// Progress indicators
	const hasType = !!values.type;
	const hasContent = values.title.length >= 5 && values.content.length >= 100;
	const hasAuthors =
		values.authors.length > 0 &&
		values.authors.every(
			(a) => a.firstName && a.lastName && a.email && a.affiliationName,
		);
	const hasKeywords = values.keywords.length > 0;

	return (
		<div className="mx-auto w-full max-w-7xl">
			<div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
				{/* Main Form */}
				<div className="overflow-hidden rounded-2xl bg-card shadow-2xl">
					<div className="p-8">
						{/* Header */}
						<div className="mb-8">
							<h1 className="text-2xl font-semibold tracking-tight">
								New Submission
							</h1>
							<p className="text-sm text-muted-foreground mt-1">
								Submit your work for ICSE 2025
							</p>
						</div>

						<form
							onSubmit={(e) => {
								e.preventDefault();
								e.stopPropagation();
								form.handleSubmit();
							}}
							className="space-y-6"
						>
							{/* Type Selection Section */}
							<div className="space-y-4">
								<div className="flex items-center gap-3">
									<IconCategory className="size-5 text-muted-foreground" />
									<h2 className="text-lg font-semibold text-foreground">
										Submission Type
									</h2>
								</div>
								<form.Field name="type">
									{(field) => (
										<div className="grid grid-cols-2 gap-3">
											{submissionTypeOptions.map((option) => {
												const Icon = option.icon;
												const isSelected = field.state.value === option.value;
												return (
													<button
														key={option.value}
														type="button"
														onClick={() => field.handleChange(option.value)}
														className={cn(
															"flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left",
															isSelected
																? "border-primary bg-primary/5"
																: "border-border hover:border-primary/50",
														)}
													>
														<div
															className={cn(
																"flex-shrink-0 p-2 rounded-md",
																isSelected ? "bg-primary/10" : "bg-muted",
															)}
														>
															<Icon
																className={cn(
																	"size-5",
																	isSelected
																		? "text-primary"
																		: "text-muted-foreground",
																)}
															/>
														</div>
														<span
															className={cn(
																"font-medium",
																isSelected
																	? "text-foreground"
																	: "text-muted-foreground",
															)}
														>
															{option.label}
														</span>
													</button>
												);
											})}
										</div>
									)}
								</form.Field>
							</div>

							<div className="border-t" />

							{/* Content Section */}
							<div className="space-y-4">
								<div className="flex items-center gap-3">
									<IconWriting className="size-5 text-muted-foreground" />
									<h2 className="text-lg font-semibold text-foreground">
										Content
									</h2>
								</div>

								<div className="space-y-4">
									<form.Field name="title">
										{(field) => (
											<div className="space-y-2">
												<Label htmlFor="title" className="text-foreground">
													Title
												</Label>
												<Input
													id="title"
													name="title"
													value={field.state.value}
													onChange={(e) => field.handleChange(e.target.value)}
													onBlur={field.handleBlur}
													className="text-foreground"
												/>
												{field.state.meta.errors.length > 0 && (
													<p className="text-xs text-destructive">
														{field.state.meta.errors[0]}
													</p>
												)}
											</div>
										)}
									</form.Field>

									<form.Field name="content">
										{(field) => (
											<div className="space-y-2">
												<div className="flex items-center justify-between">
													<Label htmlFor="content" className="text-foreground">
														Abstract
													</Label>
													<span className="text-xs text-muted-foreground">
														{field.state.value.length} characters
													</span>
												</div>
												<Textarea
													id="content"
													name="content"
													value={field.state.value}
													onChange={(e) => field.handleChange(e.target.value)}
													onBlur={field.handleBlur}
													rows={8}
													className="resize-none text-foreground"
												/>
												{field.state.meta.errors.length > 0 && (
													<p className="text-xs text-destructive">
														{field.state.meta.errors[0]}
													</p>
												)}
											</div>
										)}
									</form.Field>

									<form.Field name="file">
										{(field) => (
											<div className="space-y-2">
												<Label className="text-foreground">
													Document{" "}
													<span className="text-muted-foreground text-xs font-normal">
														(Optional)
													</span>
												</Label>
												<FileDropzone
													value={field.state.value}
													onChange={field.handleChange}
												/>
											</div>
										)}
									</form.Field>
								</div>
							</div>

							<div className="border-t" />

							{/* Authors Section */}
							<div className="space-y-4">
								<div className="flex items-center gap-3">
									<IconUsers className="size-5 text-muted-foreground" />
									<h2 className="text-lg font-semibold text-foreground">
										Authors
									</h2>
								</div>
								<form.Field name="authors">
									{(field) => (
										<div>
											<AuthorsInput
												value={field.state.value}
												onChange={field.handleChange}
											/>
											{field.state.meta.errors.length > 0 && (
												<p className="text-xs text-destructive mt-2">
													{field.state.meta.errors[0]}
												</p>
											)}
										</div>
									)}
								</form.Field>
							</div>

							<div className="border-t" />

							{/* Keywords Section */}
							<div className="space-y-4">
								<div className="flex items-center gap-3">
									<IconTags className="size-5 text-muted-foreground" />
									<h2 className="text-lg font-semibold text-foreground">
										Keywords
									</h2>
								</div>

								<form.Field name="keywords">
									{(field) => (
										<div className="space-y-2">
											<div className="rounded-lg border bg-muted/30 p-3">
												<KeywordsInput
													value={field.state.value}
													onChange={field.handleChange}
												/>
											</div>
											{field.state.meta.errors.length > 0 && (
												<p className="text-xs text-destructive">
													{field.state.meta.errors[0]}
												</p>
											)}
										</div>
									)}
								</form.Field>
							</div>

							{/* Submit */}
							<div className="flex items-center justify-between pt-4 border-t">
								<p className="text-xs text-muted-foreground">
									By submitting, you agree to the conference guidelines
								</p>
								<Button
									type="submit"
									disabled={isSubmitting}
									className="gap-2 px-6"
								>
									{isSubmitting ? (
										<>
											<div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
											Submitting...
										</>
									) : (
										<>
											<IconSend className="size-4" />
											Submit
										</>
									)}
								</Button>
							</div>
						</form>
					</div>
				</div>

				{/* Sidebar */}
				<div className="hidden lg:block">
					<div className="sticky space-y-4">
						{/* Progress Card */}
						<div className="rounded-2xl bg-card shadow-xl p-6 border">
							<h3 className="font-semibold text-foreground mb-4">Progress</h3>
							<div className="space-y-3">
								<div className="flex items-center gap-3">
									{hasType ? (
										<IconCircleCheck className="size-5 text-primary" />
									) : (
										<IconCircle className="size-5 text-muted-foreground" />
									)}
									<span
										className={cn(
											"text-sm",
											hasType ? "text-foreground" : "text-muted-foreground",
										)}
									>
										Submission Type
									</span>
								</div>
								<div className="flex items-center gap-3">
									{hasContent ? (
										<IconCircleCheck className="size-5 text-primary" />
									) : (
										<IconCircle className="size-5 text-muted-foreground" />
									)}
									<span
										className={cn(
											"text-sm",
											hasContent ? "text-foreground" : "text-muted-foreground",
										)}
									>
										Content
									</span>
								</div>
								<div className="flex items-center gap-3">
									{hasAuthors ? (
										<IconCircleCheck className="size-5 text-primary" />
									) : (
										<IconCircle className="size-5 text-muted-foreground" />
									)}
									<span
										className={cn(
											"text-sm",
											hasAuthors ? "text-foreground" : "text-muted-foreground",
										)}
									>
										Authors
									</span>
								</div>
								<div className="flex items-center gap-3">
									{hasKeywords ? (
										<IconCircleCheck className="size-5 text-primary" />
									) : (
										<IconCircle className="size-5 text-muted-foreground" />
									)}
									<span
										className={cn(
											"text-sm",
											hasKeywords ? "text-foreground" : "text-muted-foreground",
										)}
									>
										Keywords
									</span>
								</div>
							</div>
						</div>

						{/* Guidelines Card */}
						<div className="rounded-2xl bg-card shadow-xl p-6 border">
							<div className="flex items-center gap-2 mb-4">
								<IconInfoCircle className="size-5 text-muted-foreground" />
								<h3 className="font-semibold text-foreground">Guidelines</h3>
							</div>
							<div className="space-y-3 text-sm text-muted-foreground">
								<p>• Title should be concise and descriptive</p>
								<p>• Abstract minimum 100 characters</p>
								<p>• At least one author required</p>
								<p>• Add 1-5 relevant keywords</p>
								<p>• Document upload is optional</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
