import { IconBuilding, IconMail } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { withFieldGroup } from "@/shared/hooks/use-app-form";
import { titleOptions } from "@/shared/lib/labels/title";

type UserContactFields = {
	firstName: string;
	lastName: string;
	title: string | undefined;
	affiliation: string | undefined;
	email: string;
};

const defaultValues: UserContactFields = {
	firstName: "",
	lastName: "",
	title: undefined,
	affiliation: undefined,
	email: "",
};

interface UserContactFieldsGroupProps {
	afterAffiliation?: ReactNode;
}

const props: UserContactFieldsGroupProps = {};

export const UserContactFieldsGroup = withFieldGroup({
	defaultValues,
	props,
	render: function Render({ group, afterAffiliation }) {
		return (
			<>
				<div className="grid gap-4 sm:grid-cols-2">
					<group.AppField name="firstName">
						{(field) => <field.InputField label="First name *" />}
					</group.AppField>
					<group.AppField name="lastName">
						{(field) => <field.InputField label="Last name *" />}
					</group.AppField>
				</div>

				<div className="grid gap-4 sm:grid-cols-2">
					<group.AppField name="title">
						{(field) => (
							<field.SelectField
								label="Title"
								options={titleOptions}
								placeholder="—"
							/>
						)}
					</group.AppField>
					<group.AppField name="affiliation">
						{(field) => (
							<field.IconInputField
								icon={<IconBuilding className="size-4" />}
								label="Affiliation"
							/>
						)}
					</group.AppField>
				</div>

				{afterAffiliation}

				<group.AppField name="email">
					{(field) => (
						<field.IconInputField
							icon={<IconMail className="size-4" />}
							label="Email *"
							type="email"
						/>
					)}
				</group.AppField>
			</>
		);
	},
});
