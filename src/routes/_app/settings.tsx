import {
	IconLock,
	IconMail,
	IconSettings,
	IconUser,
} from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { ContactInfoSection } from "@/components/forms/profile/contact-info-section";
import { PasswordChangeSection } from "@/components/forms/profile/password-change-section";
import { PersonalInfoSection } from "@/components/forms/profile/personal-info-section";
import { PageHeader } from "@/components/layout/page-header";
import { SettingsSection } from "@/components/settings/settings-section";
import { useSession } from "@/hooks/use-session";
import type {
	ContactInfoFormData,
	PasswordChangeFormData,
	PersonalInfoFormData,
} from "@/lib/validations/profile";

export const Route = createFileRoute("/_app/settings")({
	component: SettingsPage,
});

function SettingsPage() {
	const { user } = useSession();

	if (!user) return null;

	// Personal Info handlers
	const handlePersonalInfoSave = async (data: PersonalInfoFormData) => {
		try {
			// TODO: API call to update personal info
			console.log("Saving personal info:", data);
			await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call
			toast.success("Personal information updated successfully");
		} catch (error) {
			toast.error("Failed to update personal information");
			throw error;
		}
	};

	// Contact Info handlers
	const handleContactInfoSave = async (data: ContactInfoFormData) => {
		try {
			// TODO: API call to update contact info
			console.log("Saving contact info:", data);
			await new Promise((resolve) => setTimeout(resolve, 1000));

			if (data.email !== user.email) {
				toast.success(`Verification email sent to ${data.email}`);
			} else {
				toast.success("Contact information updated successfully");
			}
		} catch (error) {
			toast.error("Failed to update contact information");
			throw error;
		}
	};

	// Password change handler
	const handlePasswordChange = async (_data: PasswordChangeFormData) => {
		try {
			// TODO: API call to change password via better-auth
			console.log("Changing password");
			await new Promise((resolve) => setTimeout(resolve, 1000));
			toast.success("Password changed successfully");
		} catch (error) {
			toast.error("Failed to change password");
			throw error;
		}
	};

	return (
		<div className="flex h-full flex-col">
			<PageHeader icon={IconSettings} title="Settings" />
			<div className="settings-page-container flex-1 overflow-auto p-4 sm:p-8">
				<div className="mx-auto max-w-5xl space-y-8">
					<SettingsSection
						icon={IconUser}
						title="Personal Information"
						description="Update your name, title, and professional details"
						delay={0}
					>
						<PersonalInfoSection
							initialData={{
								title: user.title ?? "",
								firstName: user.firstName ?? "",
								lastName: user.lastName ?? "",
								affiliation: user.affiliation ?? "",
								orcid: "", // TODO: Add orcid to user model
							}}
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
								address: user.address ?? "",
								country: user.country ?? "",
							}}
							onSave={handleContactInfoSave}
							currentEmail={user.email}
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

					<div className="h-12" />
				</div>
			</div>
		</div>
	);
}
