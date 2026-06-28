import {
	CircleCheckIcon,
	InfoIcon,
	Loader2Icon,
	OctagonXIcon,
	TriangleAlertIcon,
} from "lucide-react";
import type { CSSProperties } from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import { useTheme } from "@/shared/components/theme-provider";

function Toaster({ ...props }: ToasterProps) {
	const { theme } = useTheme();

	return (
		<Sonner
			theme={theme as ToasterProps["theme"]}
			style={
				{
					"--normal-bg": "color-mix(in oklab, var(--primary) 5%, var(--popover))",
				} as CSSProperties
			}
			icons={{
				success: <CircleCheckIcon className="size-4" />,
				info: <InfoIcon className="size-4" />,
				warning: <TriangleAlertIcon className="size-4" />,
				error: <OctagonXIcon className="size-4" />,
				loading: <Loader2Icon className="size-4 animate-spin" />,
			}}
			{...props}
		/>
	);
}

export { Toaster };
