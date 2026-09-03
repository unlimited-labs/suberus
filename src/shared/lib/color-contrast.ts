export function luminance(hex: string): number {
	const channel = (offset: number) => {
		const c = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
		return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	};
	return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

export function contrastRatio(a: string, b: string): number {
	const [x, y] = [luminance(a), luminance(b)];
	return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

export function ensureContrast(fg: string, bg: string, ratio = 4.5): string {
	if (contrastRatio(fg, bg) >= ratio) return fg;
	const target = luminance(bg) > 0.179 ? 0 : 255;
	const mix = (amount: number) =>
		`#${[1, 3, 5]
			.map((offset) => {
				const value = Number.parseInt(fg.slice(offset, offset + 2), 16);
				return Math.round(value + (target - value) * amount)
					.toString(16)
					.padStart(2, "0");
			})
			.join("")}`;
	let low = 0;
	let high = 1;
	for (let i = 0; i < 12; i++) {
		const mid = (low + high) / 2;
		if (contrastRatio(mix(mid), bg) >= ratio) high = mid;
		else low = mid;
	}
	return mix(high);
}
