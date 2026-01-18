import { useState, useCallback } from "react"
import { IconEye, IconEyeOff } from "@tabler/icons-react"

export function usePasswordVisibility() {
	const [visible, setVisible] = useState(false)

	const toggle = useCallback(() => setVisible((v) => !v), [])

	const type = visible ? "text" : "password"
	const Icon = visible ? IconEyeOff : IconEye

	return { visible, toggle, type, Icon }
}
