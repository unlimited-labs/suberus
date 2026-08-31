import { IconFileText, IconLock } from "@tabler/icons-react";
import { type QueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { extractionSettingsQueryOptions } from "@/features/extraction/api/extraction";
import {
	activeSubmissionTypesQueryOptions,
	submissionGuidelinesQueryOptions,
	submissionValidationQueryOptions,
} from "@/features/settings/api/settings";
import {
	adminCreateSubmission,
	createSubmission,
} from "@/features/submissions/api/submissions";
import type { AvailableTrack } from "@/features/submissions/types";
import { PageHeader } from "@/shared/components/layout/page-header";
import { useSession } from "@/shared/hooks/use-session";
import type { Author } from "@/shared/types/author";
import {
	buildCreateSubmissionFormData,
	runCreateSubmission,
} from "./run-create-submission";
import { SubmissionEmailGate } from "./submission-email-gate";
import { SubmissionForm, type SubmissionFormData } from "./submission-form";

export interface OnBehalfUser {
	id: string;
	firstName: string | null;
	lastName: string | null;
	email: string;
	affiliationId: string | null;
	affiliationName: string | null;
}

interface BaseProps {
	availableTracks: AvailableTrack[];
	/** Post-success side effects (query invalidation + navigation) live in the
	 * route layer, which alone may cross feature boundaries to dashboard/users. */
	onCreated: (createdId: string) => void | Promise<void>;
}

type SubmissionCreateViewProps =
	| ({ mode: "self" } & BaseProps)
	| ({ mode: "on-behalf"; onBehalfUser: OnBehalfUser } & BaseProps);

export function SubmissionCreateView(props: SubmissionCreateViewProps) {
	const { availableTracks, onCreated } = props;
	const onBehalf = props.mode === "on-behalf" ? props.onBehalfUser : null;

	const { data: typeConfigs } = useSuspenseQuery(
		activeSubmissionTypesQueryOptions(),
	);
	const { data: validationSettings } = useSuspenseQuery(
		submissionValidationQueryOptions(),
	);
	const { data: submissionGuidelines } = useSuspenseQuery(
		submissionGuidelinesQueryOptions(),
	);
	const { data: extractionSettings } = useSuspenseQuery(
		extractionSettingsQueryOptions(),
	);
	const { user } = useSession();

	const initialData = onBehalf
		? {
				authors: [
					{
						firstName: onBehalf.firstName ?? "",
						lastName: onBehalf.lastName ?? "",
						email: onBehalf.email,
						affiliationId: onBehalf.affiliationId,
						affiliationName: onBehalf.affiliationName ?? "",
						isPresenter: true,
					} satisfies Author,
				],
			}
		: undefined;

	const createAndUploadFile = async (
		data: SubmissionFormData,
		isDraft: boolean,
	) => {
		const formData = buildCreateSubmissionFormData(data, isDraft, onBehalf?.id);
		const submit = onBehalf
			? (fd: FormData) => adminCreateSubmission({ data: fd })
			: (fd: FormData) => createSubmission({ data: fd });
		const created = await runCreateSubmission(formData, submit);
		if (!created) return;

		toast.success(isDraft ? "Draft saved" : "Submission created successfully");
		await onCreated(created.id);
	};

	const title = onBehalf
		? `New Submission — ${onBehalf.firstName ?? ""} ${onBehalf.lastName ?? ""}`.trim()
		: "New Submission";

	if (typeConfigs.length === 0) {
		return (
			<div className="flex h-full flex-col">
				<PageHeader icon={IconFileText} title={title} />
				<div className="flex flex-1 items-center justify-center p-6">
					<div className="text-center">
						<IconLock className="text-muted-foreground/50 mx-auto size-12" />
						<p className="text-muted-foreground mt-4">
							No submission types are currently available
						</p>
					</div>
				</div>
			</div>
		);
	}

	if (props.mode === "self" && user && !user.emailVerified) {
		return <SubmissionEmailGate title={title} />;
	}

	return (
		<div className="flex h-full flex-col">
			<PageHeader icon={IconFileText} title={title} />
			<div className="fade flex-1 overflow-auto p-6">
				<SubmissionForm
					availableTracks={availableTracks}
					extractionEnabled={extractionSettings.enabled}
					guidelines={submissionGuidelines}
					initialData={initialData}
					onSaveDraft={(data) => createAndUploadFile(data, true)}
					onSubmit={(data) => createAndUploadFile(data, false)}
					typeConfigs={typeConfigs}
					validationSettings={validationSettings}
				/>
			</div>
		</div>
	);
}

export function ensureSubmissionCreateData(
	queryClient: QueryClient,
): Promise<unknown[]> {
	return Promise.all([
		queryClient.ensureQueryData(activeSubmissionTypesQueryOptions()),
		queryClient.ensureQueryData(submissionValidationQueryOptions()),
		queryClient.ensureQueryData(submissionGuidelinesQueryOptions()),
		queryClient.ensureQueryData(extractionSettingsQueryOptions()),
	]);
}
