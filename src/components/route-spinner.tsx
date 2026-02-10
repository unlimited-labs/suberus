import { SpinnerSvg } from "./spinner-svg";

export function RouteSpinner() {
	return (
		<div className="flex h-full items-center justify-center text-primary animate-in fade-in duration-200">
			<SpinnerSvg size={32} />
		</div>
	);
}
