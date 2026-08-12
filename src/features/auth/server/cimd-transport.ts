import { lookup } from "node:dns/promises";
import { request } from "node:https";
import { isIP } from "node:net";
import { isPublicRoutableHost } from "@better-auth/core/utils/host";
import type { ClientMetadataResourceFetch } from "@better-auth/oauth-provider";

const BODY_FORBIDDEN_STATUSES = new Set([204, 205, 304]);
const MAX_DOCUMENT_BYTES = 1024 * 1024;

function toHeaders(raw: NodeJS.Dict<string | string[]>): Headers {
	const headers = new Headers();
	for (const [name, value] of Object.entries(raw)) {
		if (Array.isArray(value))
			for (const item of value) headers.append(name, item);
		else if (value !== undefined) headers.append(name, value);
	}
	return headers;
}

/**
 * Replaces `@better-auth/cimd/node`, whose pinning `lookup` always calls back
 * with `(err, address, family)`. Node >=20 enables autoSelectFamily by default,
 * so `net` passes `all: true` and expects an array — the mismatch surfaces as
 * "Invalid IP address: undefined" and makes every CIMD fetch fail.
 * Remove once upstream honours the `all` option.
 *
 * Keeps the contract CIMD requires: resolve once, reject RFC 6890 special-use
 * addresses, pin the approved address for the connection while the hostname
 * stays the Host header and TLS SNI, and never follow redirects.
 */
export const fetchClientMetadataResource: ClientMetadataResourceFetch = async (
	input,
	init,
) => {
	const webRequest = new Request(input, init);
	const url = new URL(webRequest.url);

	if (url.protocol !== "https:") {
		throw new TypeError("CIMD transport requires an HTTPS URL");
	}
	if (webRequest.method !== "GET" && webRequest.method !== "HEAD") {
		throw new TypeError("CIMD transport supports only GET and HEAD");
	}

	const addresses = await lookup(url.hostname, { all: true, verbatim: true });
	if (addresses.length === 0) {
		throw new TypeError("metadata hostname returned no DNS addresses");
	}
	for (const entry of addresses) {
		if (!isPublicRoutableHost(entry.address)) {
			throw new TypeError(
				"metadata hostname must resolve only to public-routable addresses",
			);
		}
	}
	const pinned = addresses[0];

	const headers = Object.fromEntries(webRequest.headers.entries());
	headers.host = url.host;

	return new Promise<Response>((resolve, reject) => {
		const req = request(
			url,
			{
				agent: false,
				headers,
				method: webRequest.method,
				servername:
					isIP(url.hostname.replace(/^\[|\]$/g, "")) === 0
						? url.hostname
						: undefined,
				signal: init?.signal ?? webRequest.signal,
				lookup: (_hostname, options, callback) => {
					if (typeof options === "object" && options?.all) {
						callback(null, [
							{ address: pinned.address, family: pinned.family },
						]);
						return;
					}
					callback(null, pinned.address, pinned.family);
				},
			},
			(response) => {
				const status = response.statusCode ?? 500;
				const finish = (body: string | null) =>
					resolve(
						new Response(body, {
							headers: toHeaders(response.headers),
							status,
							statusText: response.statusMessage,
						}),
					);

				if (
					webRequest.method === "HEAD" ||
					BODY_FORBIDDEN_STATUSES.has(status)
				) {
					response.resume();
					finish(null);
					return;
				}

				const chunks: Buffer[] = [];
				let size = 0;
				response.on("data", (chunk: Buffer) => {
					size += chunk.length;
					if (size > MAX_DOCUMENT_BYTES) {
						response.destroy();
						reject(new TypeError("metadata document exceeds the size limit"));
						return;
					}
					chunks.push(chunk);
				});
				response.once("error", reject);
				response.once("end", () =>
					finish(Buffer.concat(chunks).toString("utf-8")),
				);
			},
		);
		req.once("error", reject);
		req.end();
	});
};
