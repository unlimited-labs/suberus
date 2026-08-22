import { cn } from "@/shared/lib/utils";

interface BrandLogoProps {
	logoUrl: string;
	logoDarkInvert: boolean;
	alt: string;
	className?: string;
	horizontal?: boolean;
}

export function BrandLogo({
	logoUrl,
	logoDarkInvert,
	alt,
	className,
	horizontal = false,
}: BrandLogoProps) {
	if (logoUrl) {
		return (
			<img
				alt={alt}
				className={cn(
					className,
					logoDarkInvert && "dark:invert dark:grayscale",
				)}
				src={logoUrl}
			/>
		);
	}
	const light = horizontal ? "/logo_horizontal.svg" : "/logo.svg";
	const dark = horizontal ? "/logo_horizontal_dark.svg" : "/logo_dark.svg";
	return (
		<>
			<img alt={alt} className={cn(className, "dark:hidden")} src={light} />
			<img
				alt={alt}
				className={cn(className, "hidden dark:block")}
				src={dark}
			/>
		</>
	);
}
