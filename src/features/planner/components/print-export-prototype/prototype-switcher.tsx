import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { useEffect } from "react";

export function PrototypeSwitcher<T extends string>({
	variants,
	current,
	onChange,
}: {
	variants: ReadonlyArray<{ key: T; name: string }>;
	current: T;
	onChange: (key: T) => void;
}) {
	const index = Math.max(
		0,
		variants.findIndex((v) => v.key === current),
	);
	const go = (delta: number) => {
		const next = variants[(index + delta + variants.length) % variants.length];
		if (next) onChange(next.key);
	};
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			const t = e.target;
			if (
				t instanceof HTMLElement &&
				(t.isContentEditable || ["INPUT", "TEXTAREA"].includes(t.tagName))
			)
				return;
			if (e.key === "ArrowLeft") go(-1);
			if (e.key === "ArrowRight") go(1);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	});
	if (import.meta.env.PROD) return null;
	const v = variants[index];
	return (
		<div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black px-2 py-1.5 text-sm text-white shadow-xl">
			<button
				aria-label="Previous variant"
				className="rounded-full p-1 hover:bg-white/20"
				onClick={() => go(-1)}
				type="button"
			>
				<IconChevronLeft className="size-4" />
			</button>
			<span className="px-1 whitespace-nowrap">
				<b>{v?.key}</b> ({v?.name})
			</span>
			<button
				aria-label="Next variant"
				className="rounded-full p-1 hover:bg-white/20"
				onClick={() => go(1)}
				type="button"
			>
				<IconChevronRight className="size-4" />
			</button>
		</div>
	);
}
