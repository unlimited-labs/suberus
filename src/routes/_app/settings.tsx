import {
	IconLock,
	IconMail,
	IconSettings,
	IconUser,
} from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
import { createAffiliation, getAffiliationById } from "@/utils/affiliations.functions";
import {
	changePasswordFn,
	updateContactInfoFn,
	updatePersonalInfoFn,
} from "@/utils/profile.functions";

export const Route = createFileRoute("/_app/settings")({
	component: SettingsPage,
});

function SettingsPage() {
	const { user } = useSession();
	const [affiliationName, setAffiliationName] = useState("");

	useEffect(() => {
		if (user?.affiliationId) {
			getAffiliationById({ data: { id: user.affiliationId } }).then(
				(result) => {
					if (result) setAffiliationName(result.name);
				},
			);
		}
	}, [user?.affiliationId]);

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
			toast.success("Personal information updated successfully");
		} catch (error) {
			toast.error("Failed to update personal information");
			throw error;
		}
	};

	// Contact Info handlers
	const handleContactInfoSave = async (data: ContactInfoFormData) => {
		try {
			await updateContactInfoFn({
				data: { address: data.address, country: data.country },
			});
			toast.success("Contact information updated successfully");
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
								affiliation: affiliationName,
								orcid: user.orcid ?? "",
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
							emailVerified={user.emailVerified}
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
