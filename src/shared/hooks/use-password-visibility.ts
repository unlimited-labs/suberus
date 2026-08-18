import { IconEye, IconEyeOff } from "@tabler/icons-react";
import { useState } from "react";

export function usePasswordVisibility() {
	const [visible, setVisible] = useState(false);

	const toggle = () => setVisible((v) => !v);

	const type = visible ? "text" : "password";
	const Icon = visible ? IconEyeOff : IconEye;

	return { visible, toggle, type, Icon };
}
