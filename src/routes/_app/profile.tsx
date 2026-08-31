import {
	IconClipboardList,
	IconLock,
	IconMail,
	IconUser,
} from "@tabler/icons-react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
	changeEmailFn,
	changePasswordFn,
	contactInfoQueryOptions,
	personalInfoQueryOptions,
	updateContactInfoFn,
	updatePersonalInfoFn,
} from "@/features/profile/api/profile";
import { ContactInfoSection } from "@/features/profile/components/contact-info-section";
import { PasskeySection } from "@/features/profile/components/passkey-section";
import { PasswordChangeSection } from "@/features/profile/components/password-change-section";
import { PersonalInfoSection } from "@/features/profile/components/personal-info-section";
import type {
	ContactInfoFormData,
	PasswordChangeFormData,
	PersonalInfoFormData,
} from "@/features/profile/validations";
import { getRegistrationStatusFn } from "@/features/settings/api/settings";
import { SettingsSection } from "@/features/settings/components/settings-section";
import {
	activeSurveyQuestionsQueryOptions,
	saveUserSurveyAnswersFn,
	userSurveyAnswersQueryOptions,
} from "@/features/survey/api/survey";
import { SurveyAnswersForm } from "@/features/survey/components/survey-answers-form";
import { PageHeader } from "@/shared/components/layout/page-header";
import { useSession } from "@/shared/hooks/use-session";
import { createAffiliation } from "@/shared/server/affiliations-fn";

export const Route = createFileRoute("/_app/profile")({
	loader: async ({ context }) => {
		const [, , , , registrationStatus] = await Promise.all([
			context.queryClient.ensureQueryData(personalInfoQueryOptions()),
			context.queryClient.ensureQueryData(contactInfoQueryOptions()),
			context.queryClient.ensureQueryData(activeSurveyQuestionsQueryOptions()),
			context.queryClient.ensureQueryData(userSurveyAnswersQueryOptions()),
			getRegistrationStatusFn(),
		]);
		return { contactConsentEnabled: registrationStatus.contactConsentEnabled };
	},
	component: SettingsPage,
});

const handlePasswordChange = async (data: PasswordChangeFormData) => {
	try {
		await changePasswordFn({
			data: {
				currentPassword: data.currentPassword,
				newPassword: data.newPassword,
			},
		});
		toast.success("Password changed successfully");
	} catch (error) {
		toast.error("Failed to change password");
		throw error;
	}
};

function SettingsPage() {
	const { user, refetch: refetchSession } = useSession();
	const queryClient = useQueryClient();

	const handleSaveSurvey = async (
		answers: { questionId: string; value: string }[],
	) => {
		try {
			await saveUserSurveyAnswersFn({ data: { answers } });
			await queryClient.invalidateQueries({
				queryKey: userSurveyAnswersQueryOptions().queryKey,
			});
			toast.success("Survey preferences saved");
		} catch {
			toast.error("Failed to save survey preferences");
		}
	};
	const { data: personalInfo } = useSuspenseQuery(personalInfoQueryOptions());
	const { data: contactInfo } = useSuspenseQuery(contactInfoQueryOptions());
	const { data: surveyQuestions } = useSuspenseQuery(
		activeSurveyQuestionsQueryOptions(),
	);
	const { data: surveyAnswersRaw } = useSuspenseQuery(
		userSurveyAnswersQueryOptions(),
	);
	const surveyAnswers = surveyAnswersRaw.map((a) => ({
		questionId: a.questionId,
		value: a.value,
	}));
	const [pendingEmail, setPendingEmail] = useState<string>();
	const { contactConsentEnabled } = Route.useLoaderData();

	if (!user) return null;

	const handlePersonalInfoSave = async (data: PersonalInfoFormData) => {
		try {
			let affiliationId: string | undefined;
			if (data.affiliation?.trim()) {
				const aff = await createAffiliation({
					data: { name: data.affiliation.trim() },
				});
				affiliationId = aff.id;
			}

			await updatePersonalInfoFn({
				data: {
					firstName: data.firstName,
					lastName: data.lastName,
					title: data.title,
					affiliationId: affiliationId ?? "",
					orcid: data.orcid,
					website: data.website,
					linkedin: data.linkedin,
				},
			});
			await Promise.all([
				queryClient.invalidateQueries(personalInfoQueryOptions()),
				refetchSession(),
			]);
			toast.success("Personal information updated successfully");
		} catch (error) {
			toast.error("Failed to update personal information");
			throw error;
		}
	};

	const handleContactInfoSave = async (
		data: ContactInfoFormData,
		currentPassword?: string,
	) => {
		try {
			if (data.email !== user.email) {
				await changeEmailFn({
					data: {
						newEmail: data.email,
						currentPassword: currentPassword ?? "",
					},
				});
				setPendingEmail(data.email);
				toast.success("Verification email sent to your new address");
			}
			await updateContactInfoFn({
				data: {
					needInvoice: data.needInvoice,
					address: data.address,
					country: data.country,
					contactConsent: data.contactConsent,
				},
			});
			await Promise.all([
				queryClient.invalidateQueries(contactInfoQueryOptions()),
				refetchSession(),
			]);
			if (data.email === user.email) {
				toast.success("Contact information updated successfully");
			}
		} catch (error) {
			const message =
				error instanceof Error && error.message === "Incorrect password"
					? error.message
					: "Failed to update contact information";
			toast.error(message);
			throw error;
		}
	};

	return (
		<div className="flex h-full flex-col">
			<PageHeader icon={IconUser} title="Profile" />
			<div className="flex-1 overflow-auto p-4 sm:p-8">
				<div className="mx-auto max-w-5xl space-y-8">
					<SettingsSection
						delay={0}
						description="Update your name, title, and professional details"
						icon={IconUser}
						title="Personal Information"
					>
						<PersonalInfoSection
							initialData={personalInfo}
							onSave={handlePersonalInfoSave}
						/>
					</SettingsSection>

					<SettingsSection
						delay={100}
						description="Update your email and billing address"
						icon={IconMail}
						title="Contact & Invoice Information"
					>
						<ContactInfoSection
							contactConsentEnabled={contactConsentEnabled}
							currentEmail={user.email}
							emailVerified={user.emailVerified}
							initialData={{
								email: user.email,
								needInvoice: contactInfo.needInvoice,
								address: contactInfo.address,
								country: contactInfo.country,
								contactConsent: contactInfo.contactConsent,
							}}
							onSave={handleContactInfoSave}
							pendingEmail={pendingEmail}
						/>
					</SettingsSection>

					<SettingsSection
						delay={200}
						description="Change your password and manage passkeys"
						icon={IconLock}
						title="Security"
					>
						<PasswordChangeSection onSave={handlePasswordChange} />
						<PasskeySection />
					</SettingsSection>

					{surveyQuestions.length > 0 && (
						<SettingsSection
							delay={300}
							description="Update your conference survey preferences"
							icon={IconClipboardList}
							title="Survey"
						>
							<SurveyAnswersForm
								initialAnswers={surveyAnswers}
								onSave={handleSaveSurvey}
								questions={surveyQuestions}
							/>
						</SettingsSection>
					)}

					<div className="h-12" />
				</div>
			</div>
		</div>
	);
}
