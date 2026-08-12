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

function clamp(value: string): string {
	return value.length > MAX_FIELD_LENGTH
		? `${value.slice(0, MAX_FIELD_LENGTH)}…`
		: value;
}

// Registration is unauthenticated, so the document is attacker-controlled:
// copy only the audited fields and bound every one before it reaches a log row.
function snapshot(client: AuditedClient, document: MetadataDocument) {
	return {
		clientId: clamp(client.clientId),
		clientName: document.client_name ? clamp(document.client_name) : null,
		redirectUris: (document.redirect_uris ?? [])
			.slice(0, MAX_REDIRECT_URIS)
			.map(clamp),
	};
}

export function mcpClientRegisteredDetail(
	client: AuditedClient,
	document: MetadataDocument,
) {
	return activityDetail("MCP_CLIENT_REGISTERED", snapshot(client, document));
}

function sameList(a: readonly string[], b: readonly string[]): boolean {
	return a.length === b.length && a.every((value, index) => value === b[index]);
}

/**
 * Audit-worthy differences produced by a metadata refresh. An empty result
 * means the refresh is not worth a log row: a client whose document is
 * re-fetched on every authorization would otherwise bury the audit trail.
 */
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
		...snapshot(client, document),
		changedFields,
	});
}
