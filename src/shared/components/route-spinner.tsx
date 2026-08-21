import { SpinnerSvg } from "./spinner-svg";

export function RouteSpinner() {
	return (
		<div className="text-primary animate-in fade-in flex h-full items-center justify-center duration-200">
			<SpinnerSvg size={32} />
		</div>
	);
}
