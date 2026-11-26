// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useAppForm } from "@/shared/hooks/use-app-form";

afterEach(cleanup);

function PasswordForm() {
	const form = useAppForm({ defaultValues: { password: "" } });
	return (
		<form.AppField name="password">
			{(field) => (
				<field.PasswordField
					autoComplete="new-password"
					description="Min. 10 characters"
					label="Password"
					required
				/>
			)}
		</form.AppField>
	);
}

describe("FormPasswordField", () => {
	it("gives the browser and screen readers what they need on the input", () => {
		const { getByLabelText } = render(<PasswordForm />);
		const input = getByLabelText("Password") as HTMLInputElement;

		expect(input.name).toBe("password");
		expect(input.autocomplete).toBe("new-password");
		expect(input.required).toBe(true);
		expect(input.getAttribute("aria-describedby")).toBe("password-description");
	});
});
