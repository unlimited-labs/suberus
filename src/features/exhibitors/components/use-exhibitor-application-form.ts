import { useStore } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import {
	type getMyExhibitorFn,
	myExhibitorQueryOptions,
	saveExhibitorApplicationFn,
} from "@/features/exhibitors/api/exhibitors";
import { exhibitorPresentationSchema } from "@/features/exhibitors/validations";
import { useAppForm } from "@/shared/hooks/use-app-form";
import type { Author } from "@/shared/types/author";

export type MyExhibitor = NonNullable<
	Awaited<ReturnType<typeof getMyExhibitorFn>>
>;

const emptyAuthor: Author = {
	firstName: "",
	lastName: "",
	email: "",
	affiliationId: null,
	affiliationName: "",
	isPresenter: true,
};

const formSchema = z
	.object({
		companyName: z
			.string()
			.min(1, "Company name is required")
			.max(200, "Company name must be at most 200 characters"),
		description: z
			.string()
			.max(5000, "Description must be at most 5000 characters"),
		website: z.url("Invalid URL").or(z.literal("")),
		addPresentation: z.boolean(),
		presentationTitle: z.string(),
		presentationContent: z.string(),
		authors: z.array(
			z.object({
				firstName: z.string(),
				lastName: z.string(),
				email: z.string(),
				affiliationId: z.string().nullable(),
				affiliationName: z.string(),
				isPresenter: z.boolean(),
			}),
		),
	})
	.superRefine((values, ctx) => {
		if (!values.addPresentation) return;
		// Reuse the server-side presentation schema so messages stay in sync
		const result = exhibitorPresentationSchema.safeParse({
			title: values.presentationTitle,
			content: values.presentationContent,
			authors: values.authors,
		});
		if (result.success) return;
		for (const issue of result.error.issues) {
			const field =
				issue.path[0] === "title"
					? "presentationTitle"
					: issue.path[0] === "content"
						? "presentationContent"
						: "authors";
			ctx.addIssue({ code: "custom", message: issue.message, path: [field] });
		}
	});

interface UseExhibitorApplicationFormArgs {
	exhibitor: MyExhibitor;
	allowPresentation: boolean;
}

/**
 * Owns the exhibitor application form: the form instance with company +
 * (optional) presentation validation, the save flow, the lock/withdraw guards
 * and the withdraw dialog state. Leaves the card as presentation.
 */
export function useExhibitorApplicationForm({
	exhibitor,
	allowPresentation,
}: UseExhibitorApplicationFormArgs) {
	const queryClient = useQueryClient();
	const [withdrawOpen, setWithdrawOpen] = useState(false);
	const submission = exhibitor.submission;

	// Mirrors the server lock condition in saveExhibitorApplication
	const isLocked =
		exhibitor.status !== "PENDING" || Boolean(exhibitor.decidedAt);
	const canWithdraw = !isLocked && Boolean(exhibitor.appliedAt);

	const form = useAppForm({
		defaultValues: {
			companyName: exhibitor.companyName ?? "",
			description: exhibitor.description ?? "",
			website: exhibitor.website ?? "",
			addPresentation: Boolean(submission),
			presentationTitle: submission?.title ?? "",
			presentationContent: submission?.content ?? "",
			authors: submission?.authors.length
				? submission.authors.map((a) => ({
						firstName: a.firstName,
						lastName: a.lastName,
						email: a.email,
						affiliationId: a.affiliationId,
						// AffiliationSelect resolves the name from affiliationId on mount
						affiliationName: "",
						isPresenter: a.isPresenter,
					}))
				: [emptyAuthor],
		},
		validators: {
			onChange: formSchema,
			onSubmit: formSchema,
		},
		onSubmit: async ({ value }) => {
			try {
				await saveExhibitorApplicationFn({
					data: {
						companyName: value.companyName,
						description: value.description || undefined,
						website: value.website,
						presentation:
							allowPresentation && value.addPresentation
								? {
										title: value.presentationTitle,
										content: value.presentationContent,
										authors: value.authors,
									}
								: undefined,
					},
				});
				toast.success(
					exhibitor.appliedAt ? "Application updated" : "Application submitted",
				);
				await queryClient.invalidateQueries({
					queryKey: myExhibitorQueryOptions().queryKey,
				});
			} catch (error) {
				toast.error(
					error instanceof Error ? error.message : "Failed to save application",
				);
			}
		},
	});

	const addPresentation = useStore(form.store, (s) => s.values.addPresentation);
	const submissionAttempts = useStore(form.store, (s) => s.submissionAttempts);

	return {
		form,
		addPresentation,
		submissionAttempts,
		isLocked,
		canWithdraw,
		withdrawOpen,
		setWithdrawOpen,
	};
}

export type ExhibitorApplicationFormApi = ReturnType<
	typeof useExhibitorApplicationForm
>["form"];
