import { activityDetail } from "@/features/activity-log/types";

type MetadataDocument = {
	client_name?: string;
	redirect_uris?: string[];
};

type AuditedClient = {
	clientId: string;
	name?: string;
	redirectUris?: string[];
	scopes?: readonly string[];
};

const MAX_REDIRECT_URIS = 10;
const MAX_FIELD_LENGTH = 500;

function truncate(value: string): string {
	return value.length > MAX_FIELD_LENGTH
		? `${value.slice(0, MAX_FIELD_LENGTH)}…`
		: value;
}

// Registration is unauthenticated: the document is attacker-controlled, so
// copy only audited fields and bound each before it reaches a log row.
function snapshot(clientId: string, document: MetadataDocument) {
	return {
		clientId: truncate(clientId),
		clientName: document.client_name ? truncate(document.client_name) : null,
		redirectUris: (document.redirect_uris ?? [])
			.slice(0, MAX_REDIRECT_URIS)
			.map(truncate),
	};
}

export function mcpClientRegisteredDetail(
	client: AuditedClient,
	document: MetadataDocument,
) {
	return activityDetail(
		"MCP_CLIENT_REGISTERED",
		snapshot(client.clientId, document),
	);
}

function sameList(a: readonly string[], b: readonly string[]): boolean {
	return a.length === b.length && a.every((value, index) => value === b[index]);
}

/** Empty = not worth a log row; documents are re-fetched on every authorize. */
export function mcpClientChangedFields(
	previous: AuditedClient,
	next: AuditedClient,
): string[] {
	const changed: string[] = [];
	if ((previous.name ?? null) !== (next.name ?? null)) changed.push("name");
	if (!sameList(previous.redirectUris ?? [], next.redirectUris ?? []))
		changed.push("redirectUris");
	if (!sameList(previous.scopes ?? [], next.scopes ?? []))
		changed.push("scopes");
	return changed;
}

export function mcpClientUpdatedDetail(
	client: AuditedClient,
	document: MetadataDocument,
	changedFields: string[],
) {
	return activityDetail("MCP_CLIENT_UPDATED", {
		...snapshot(client.clientId, document),
		changedFields,
	});
}
