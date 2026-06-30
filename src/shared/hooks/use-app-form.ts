import { createFormHook } from "@tanstack/react-form";
import { FormCheckboxField } from "@/shared/components/composable/checkbox-field";
import { FormCountryComboboxField } from "@/shared/components/composable/country-combobox-field";
import { FormIconInputField } from "@/shared/components/composable/icon-input-field";
import { FormInputField } from "@/shared/components/composable/input-field";
import { FormPasswordField } from "@/shared/components/composable/password-field";
import { FormSelectField } from "@/shared/components/composable/select-field";
import { FormSubmitButton } from "@/shared/components/composable/submit-button";
import { FormSwitchField } from "@/shared/components/composable/switch-field";
import { FormTextareaField } from "@/shared/components/composable/textarea-field";
import { fieldContext, formContext } from "./form-context";

export const { useAppForm, withFieldGroup } = createFormHook({
	fieldComponents: {
		InputField: FormInputField,
		IconInputField: FormIconInputField,
		PasswordField: FormPasswordField,
		TextareaField: FormTextareaField,
		SelectField: FormSelectField,
		CheckboxField: FormCheckboxField,
		SwitchField: FormSwitchField,
		CountryComboboxField: FormCountryComboboxField,
	},
	formComponents: {
		SubmitButton: FormSubmitButton,
	},
	fieldContext,
	formContext,
});
