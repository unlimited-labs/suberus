import { withFieldGroup } from "@/hooks/use-app-form";

// Reusable password + confirmation pair. The "passwords match" rule lives here
// once (field-level validator) instead of being duplicated across every auth
// schema. Field names are mapped per form (e.g. newPassword/confirmPassword).
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
							label={passwordLabel}
							description={passwordDescription || undefined}
							placeholder={passwordPlaceholder || undefined}
							disabled={disabled}
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
						<field.PasswordField label={confirmLabel} disabled={disabled} />
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
