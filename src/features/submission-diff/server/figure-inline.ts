import { getFileBuffer } from "@/shared/server/storage";
import { figureKey } from "./cas";
import { figureShas, mapFigureSrcs } from "./figure-refs";

/**
 * Inline content-addressed figures as `data:` URIs so the redline iframe is
 * fully self-contained. Avoids an auth-gated subresource request — which the
 * Nitro dev server misroutes to a 404 on `sec-fetch-dest: image`, and which a
 * sandboxed iframe would block as a download — at the cost of base64 bloat in
 * the redline payload.
 */
export async function inlineFigures(html: string): Promise<string> {
	const shas = figureShas(html);
	if (shas.length === 0) return html;
	const uris = new Map(
		await Promise.all(
			shas.map(async (sha) => {
				const buf = await getFileBuffer(figureKey(sha));
				return [
					sha,
					`data:image/png;base64,${buf.toString("base64")}`,
				] as const;
			}),
		),
	);
	return mapFigureSrcs(html, (sha) => uris.get(sha));
}
