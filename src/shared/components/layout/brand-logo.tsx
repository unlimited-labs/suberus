import { cn } from "@/shared/lib/utils";

interface BrandLogoProps {
	logoUrl: string;
	logoDarkInvert: boolean;
	alt: string;
	className?: string;
}

export function BrandLogo({
	logoUrl,
	logoDarkInvert,
	alt,
	className,
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
	return (
		<>
			<img src="/logo.svg" alt={alt} className={cn(className, "dark:hidden")} />
			<img
				src="/logo_dark.svg"
				alt={alt}
				className={cn(className, "hidden dark:block")}
			/>
		</>
	);
}
