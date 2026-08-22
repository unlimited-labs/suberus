import { withFieldGroup } from "@/shared/hooks/use-app-form";

type PasswordPairFields = {
	password: string;
	confirm: string;
};

// Keys are used for field mapping; values are not used at runtime.
const defaultValues: PasswordPairFields = {
	password: "",
	confirm: "",
};

// Props are optional (defaults applied in render); withFieldGroup does not
// apply the `props` defaults at runtime.
interface PasswordFieldsGroupProps {
	passwordLabel?: string;
	confirmLabel?: string;
	passwordDescription?: string;
	passwordPlaceholder?: string;
	disabled?: boolean;
	twoColumn?: boolean;
}

const props: PasswordFieldsGroupProps = {};

export const PasswordFieldsGroup = withFieldGroup({
	defaultValues,
	props,
	render: function Render({
		group,
		passwordLabel = "Password",
		confirmLabel = "Confirm Password",
		passwordDescription = "",
		passwordPlaceholder = "",
		disabled = false,
		twoColumn = false,
	}) {
		const fields = (
			<>
				<group.AppField name="password">
					{(field) => (
						<field.PasswordField
							description={passwordDescription || undefined}
							disabled={disabled}
							label={passwordLabel}
							placeholder={passwordPlaceholder || undefined}
						/>
					)}
				</group.AppField>

				<group.AppField
					name="confirm"
					validators={{
						onChangeListenTo: ["password"],
						onChange: ({ value }) =>
							value !== group.getFieldValue("password")
								? "Passwords do not match"
								: undefined,
					}}
				>
					{(field) => (
						<field.PasswordField disabled={disabled} label={confirmLabel} />
					)}
				</group.AppField>
			</>
		);

		if (twoColumn) {
			return <div className="grid gap-3 sm:grid-cols-2">{fields}</div>;
		}
		return fields;
	},
});
