import { cn } from "@/shared/lib/utils";

interface BrandLogoProps {
	logoUrl: string;
	logoDarkInvert: boolean;
	alt: string;
	className?: string;
	/** Use the horizontal logo lockup (wordmark beside mark) for the fallback. */
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
				src={logoUrl}
				alt={alt}
				className={cn(
					className,
					logoDarkInvert && "dark:invert dark:grayscale",
				)}
			/>
		);
	}
	const light = horizontal ? "/logo_horizontal.svg" : "/logo.svg";
	const dark = horizontal ? "/logo_horizontal_dark.svg" : "/logo_dark.svg";
	return (
		<>
			<img src={light} alt={alt} className={cn(className, "dark:hidden")} />
			<img
				src={dark}
				alt={alt}
				className={cn(className, "hidden dark:block")}
			/>
		</>
	);
}
