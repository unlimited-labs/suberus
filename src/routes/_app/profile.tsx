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
import { SettingsSection } from "@/components/settings/settings-section";
import {
	changeEmailFn,
	changePasswordFn,
	personalInfoQueryOptions,
	updateContactInfoFn,
	updatePersonalInfoFn,
} from "@/features/profile/api/profile";
import { ContactInfoSection } from "@/features/profile/components/contact-info-section";
import { PasswordChangeSection } from "@/features/profile/components/password-change-section";
import { PersonalInfoSection } from "@/features/profile/components/personal-info-section";
import { SurveySection } from "@/features/profile/components/survey-section";
import type {
	ContactInfoFormData,
	PasswordChangeFormData,
	PersonalInfoFormData,
} from "@/features/profile/validations";
import { createAffiliation } from "@/server-fns/affiliations";
import {
	activeSurveyQuestionsQueryOptions,
	userSurveyAnswersQueryOptions,
} from "@/server-fns/settings/survey";
import { PageHeader } from "@/shared/components/layout/page-header";
import { useSession } from "@/shared/hooks/use-session";

export const Route = createFileRoute("/_app/profile")({
	loader: async ({ context }) => {
		await Promise.all([
			context.queryClient.ensureQueryData(personalInfoQueryOptions()),
			context.queryClient.ensureQueryData(activeSurveyQuestionsQueryOptions()),
			context.queryClient.ensureQueryData(userSurveyAnswersQueryOptions()),
		]);
	},
	component: SettingsPage,
});

function SettingsPage() {
	const { user, refetch: refetchSession } = useSession();
	const queryClient = useQueryClient();
	const { data: personalInfo } = useSuspenseQuery(personalInfoQueryOptions());
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

	if (!user) return null;

	// Personal Info handlers
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

	// Contact Info handlers
	const handleContactInfoSave = async (data: ContactInfoFormData) => {
		try {
			if (data.email !== user.email) {
				await changeEmailFn({ data: { newEmail: data.email } });
				setPendingEmail(data.email);
				toast.success("Verification email sent to your new address");
			}
			await updateContactInfoFn({
				data: {
					needInvoice: data.needInvoice,
					address: data.address,
					country: data.country,
				},
			});
			await refetchSession();
			if (data.email === user.email) {
				toast.success("Contact information updated successfully");
			}
		} catch (error) {
			toast.error("Failed to update contact information");
			throw error;
		}
	};

	// Password change handler
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

	return (
		<div className="flex h-full flex-col">
			<PageHeader icon={IconUser} title="Profile" />
			<div className="settings-page-container flex-1 overflow-auto p-4 sm:p-8">
				<div className="mx-auto max-w-5xl space-y-8">
					<SettingsSection
						icon={IconUser}
						title="Personal Information"
						description="Update your name, title, and professional details"
						delay={0}
					>
						<PersonalInfoSection
							initialData={personalInfo}
							onSave={handlePersonalInfoSave}
						/>
					</SettingsSection>

					<SettingsSection
						icon={IconMail}
						title="Contact & Invoice Information"
						description="Update your email and billing address"
						delay={100}
					>
						<ContactInfoSection
							initialData={{
								email: user.email,
								needInvoice: user.needInvoice,
								address: user.address ?? "",
								country: user.country ?? "",
							}}
							onSave={handleContactInfoSave}
							currentEmail={user.email}
							emailVerified={user.emailVerified}
							pendingEmail={pendingEmail}
						/>
					</SettingsSection>

					<SettingsSection
						icon={IconLock}
						title="Security"
						description="Change your password"
						delay={200}
					>
						<PasswordChangeSection onSave={handlePasswordChange} />
					</SettingsSection>

					{surveyQuestions.length > 0 && (
						<SettingsSection
							icon={IconClipboardList}
							title="Survey"
							description="Update your conference survey preferences"
							delay={300}
						>
							<SurveySection
								questions={surveyQuestions}
								initialAnswers={surveyAnswers}
							/>
						</SettingsSection>
					)}

					<div className="h-12" />
				</div>
			</div>
		</div>
	);
}
