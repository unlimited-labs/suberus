import { createFormHook } from "@tanstack/react-form";

import { FormCheckboxField } from "@/components/forms/composable/checkbox-field";
import { FormIconInputField } from "@/components/forms/composable/icon-input-field";
import { FormInputField } from "@/components/forms/composable/input-field";
import { FormPasswordField } from "@/components/forms/composable/password-field";
import { FormSelectField } from "@/components/forms/composable/select-field";
import { FormTextareaField } from "@/components/forms/composable/textarea-field";
import { fieldContext, formContext } from "./form-context";

export const { useAppForm } = createFormHook({
	fieldComponents: {
		InputField: FormInputField,
		IconInputField: FormIconInputField,
		PasswordField: FormPasswordField,
		TextareaField: FormTextareaField,
		SelectField: FormSelectField,
		CheckboxField: FormCheckboxField,
	},
	formComponents: {},
	fieldContext,
	formContext,
});
