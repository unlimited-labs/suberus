import { randomUUID } from "node:crypto";
import { cimd } from "@better-auth/cimd";
import { mcp } from "@better-auth/mcp";
import { passkey } from "@better-auth/passkey";
import { PrismaPg } from "@prisma/adapter-pg";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { jwt } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { env } from "@/env";
import { logActivity } from "@/features/activity-log/server/activity-log";
import { activityDetail } from "@/features/activity-log/types";
import { recordMcpClientActivity } from "@/features/auth/server/cimd-audit";
import {
	mcpClientChangedFields,
	mcpClientRegisteredDetail,
	mcpClientUpdatedDetail,
} from "@/features/auth/server/cimd-audit-rules";
import { fetchClientMetadataResource } from "@/features/auth/server/cimd-transport";
import { getSetting } from "@/features/settings/server/settings";
import { PrismaClient, UserRole } from "@/generated/prisma/client";
import { logger } from "@/logger.ts";
import { sendEmail } from "@/shared/server/email";
import { linkCoAuthorsByEmail } from "@/shared/server/link-coauthors";

import "dotenv/config";

const connectionString = env.DATABASE_URL;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// mcp() IS the OAuth provider (it wraps oauthProvider), so it must never be
// combined with a separate oauthProvider(); cimd() contributes unauthenticated
// client discovery to it, replacing DCR per MCP 2026-07-28.
export const MCP_RESOURCE = `${env.APP_BASE_URL}/api/mcp`;
export const MCP_RESOURCE_NAME = "Suberus MCP";
/**
 * Identity scopes plus this resource's own capability scopes. The capability
 * ones are what a client can be granted less than: they are not on the
 * authorization-server-only list, so they reach `scopes_supported` in the
 * protected resource metadata, which is where MCP clients read the scope set
 * to request from.
 *
 * MEASUREMENT IN PROGRESS: no tool is gated on them yet. Gate only once a real
 * client is observed asking for them (read `oauthConsent.scopes`), otherwise
 * gating would hide every tool from a client that requests a fixed scope set.
 */
export const MCP_SCOPE_USERS_READ = "users:read";
export const MCP_SCOPE_USERS_WRITE = "users:write";

export const MCP_SCOPES = [
	"openid",
	"profile",
	"email",
	"offline_access",
	MCP_SCOPE_USERS_READ,
	MCP_SCOPE_USERS_WRITE,
] as const;

const mcpPlugins = env.MCP_ENABLED
	? [
			jwt(),
			mcp({
				loginPage: "/login",
				consentPage: "/consent",
				resource: MCP_RESOURCE,
				scopes: [...MCP_SCOPES],
				// claude.ai's metadata document declares jwt-bearer, and registration
				// rejects any grant outside this list (stricter than RFC 7591 §2,
				// which lets the server replace values instead). Accepting the
				// declaration costs nothing: the token endpoint has no handler for it
				// and still answers unsupported_grant_type.
				grantTypes: [
					"authorization_code",
					"refresh_token",
					"client_credentials",
					"urn:ietf:params:oauth:grant-type:jwt-bearer",
				],
				// The resource is declared in full because the provider seeds a bare
				// identifier with `allowedScopes: null`, which its own Prisma schema
				// stores as a non-null String[] — read back as [], that denies every
				// scope. Listing them explicitly keeps the row meaningful.
				resources: [
					{
						identifier: MCP_RESOURCE,
						name: MCP_RESOURCE_NAME,
						allowedScopes: [...MCP_SCOPES],
					},
				],
				// insertOnly (the default) would leave the seeded row's allowedScopes
				// frozen at whatever the first boot wrote, so a scope added here would
				// never reach the resource that intersects against it.
				resourceSeedMode: "merge",
				// routes/[.]well-known.$.ts forwards the issuer-suffixed discovery
				// path into the auth handler; verified serving 200.
				silenceWarnings: { oauthAuthServerConfig: true },
			}),
			cimd({
				fetchClientMetadataResource,
				metadataProfile: "mcp-2026-07-28",
				// The only hook that sees a registration attempt before it can be
				// rejected. Without it a refused client leaves no trace: the API error
				// carries the reason but never the client_id.
				isMetadataDocumentUrlAllowed: (clientIdUrl) => {
					logger.info(`[mcp] CIMD registration attempt: ${clientIdUrl}`);
					return (
						env.MCP_CIMD_ALLOWED_ORIGINS.length === 0 ||
						env.MCP_CIMD_ALLOWED_ORIGINS.includes(new URL(clientIdUrl).origin)
					);
				},
				onClientCreated: async ({ client, clientMetadataDocument }) => {
					logger.info(
						`[mcp] CIMD client registered: ${client.clientId} (${clientMetadataDocument.client_name ?? "unnamed"})`,
					);
					await recordMcpClientActivity({
						type: "MCP_CLIENT_REGISTERED",
						detail: mcpClientRegisteredDetail(client, clientMetadataDocument),
					});
				},
				onClientRefreshed: async ({
					client,
					previousClient,
					clientMetadataDocument,
				}) => {
					const changedFields = mcpClientChangedFields(previousClient, client);
					if (changedFields.length === 0) return;
					logger.info(
						`[mcp] CIMD client metadata changed: ${client.clientId} (${changedFields.join(", ")})`,
					);
					await recordMcpClientActivity({
						type: "MCP_CLIENT_UPDATED",
						detail: mcpClientUpdatedDetail(
							client,
							clientMetadataDocument,
							changedFields,
						),
					});
				},
			}),
		]
	: [];

export const auth = betterAuth({
	baseURL: env.APP_BASE_URL,
	secret: env.AUTH_SECRET,
	trustedOrigins:
		env.NODE_ENV === "development"
			? [
					"http://localhost:3001",
					"http://localhost:3031",
					"http://localhost:3032",
					"http://localhost:3033",
				]
			: [],
	database: prismaAdapter(prisma, {
		provider: "postgresql",
	}),
	plugins: [
		// rpName is only a label (shown in the OS passkey prompt); credential isolation
		// is by rpID = the instance's domain, so a shared name never collides across tenants.
		passkey({
			rpID: new URL(env.APP_BASE_URL).hostname,
			rpName: "Suberus",
			origin: new URL(env.APP_BASE_URL).origin,
			authenticatorSelection: {
				// Allow any authenticator, but require a discoverable credential +
				// user-verification gesture so mobile biometrics give usernameless login.
				residentKey: "required",
				userVerification: "required",
			},
		}),
		...mcpPlugins,
		// Must stay last: better-auth forwards Set-Cookie to the framework store
		// from this plugin's after-hook, so any plugin registered later would have
		// its cookies dropped.
		tanstackStartCookies(),
	],
	advanced: {
		database: {
			generateId: () => randomUUID(),
		},
	},
	// Explicit throttling of auth endpoints (login, reset, sign-up). Since email
	// verification is a soft block, login is the brute-force surface — don't rely
	// on framework defaults silently changing.
	rateLimit: {
		// Throttle auth endpoints in production only. Left off in dev/E2E, where
		// there is no trusted proxy IP to key the limiter on (better-auth would
		// otherwise warn and skip on every request).
		enabled: env.NODE_ENV === "production" && !env.E2E,
		window: 60,
		max: 20,
	},
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: false, // Soft-block: users can login, but app restricts actions
		minPasswordLength: 10,
		sendResetPassword: async ({ user, url }) => {
			const extUser = user as typeof user & { firstName?: string };
			await sendEmail("PASSWORD_RESET", user.email, {
				firstName: extUser.firstName ?? user.email,
				resetUrl: url,
				conferenceName: await getSetting("CONFERENCE_NAME"),
			});
		},
	},
	emailVerification: {
		sendOnSignUp: true,
		autoSignInAfterVerification: true,
		callbackURL: "/?verified=true",
		expiresIn: 24 * 60 * 60, // 24h
		sendVerificationEmail: async ({ user, url }) => {
			const extUser = user as typeof user & { firstName?: string };
			await sendEmail("EMAIL_VERIFICATION", user.email, {
				firstName: extUser.firstName ?? user.email,
				verificationUrl: url,
				conferenceName: await getSetting("CONFERENCE_NAME"),
			});
		},
	},
	user: {
		modelName: "user",
		changeEmail: {
			enabled: true,
		},
		fields: {
			name: "lastName",
			email: "email",
		},
		additionalFields: {
			firstName: {
				type: "string",
				required: false,
				input: true,
			},
			// returned: false — these are write-only via the auth API (registration
			// + admin edit); the app reads them from the DB (profile slice queries),
			// so they don't need to bloat every get-session response.
			title: {
				type: "string",
				required: false,
				input: true,
				returned: false,
			},
			affiliationId: {
				type: "string",
				required: false,
				input: true,
			},
			address: {
				type: "string",
				required: false,
				input: true,
				returned: false,
			},
			country: {
				type: "string",
				required: false,
				input: true,
				returned: false,
			},
			needInvoice: {
				type: "boolean",
				required: false,
				input: true,
				returned: false,
			},
			role: {
				type: Object.keys(UserRole) as (keyof typeof UserRole)[],
				required: false,
				defaultValue: UserRole.AUTHOR,
				input: false,
			},
		},
	},
	onAPIError: {
		onError: (error, _ctx) => {
			logger.error("[auth] API error:", error);
		},
	},
	session: {
		modelName: "session",
		expiresIn: 60 * 60 * 24 * 7, // 7 days
		updateAge: 60 * 60 * 24, // 1 day
	},
	account: {
		modelName: "account",
	},
	verification: {
		modelName: "verification",
	},
	databaseHooks: {
		session: {
			create: {
				after: async (session) => {
					await prisma.user.update({
						where: { id: session.userId },
						data: { lastLoginAt: new Date() },
					});
				},
			},
		},
		user: {
			create: {
				after: async (user) => {
					await logActivity({
						type: "USER_REGISTERED",
						userId: user.id,
						detail: activityDetail("USER_REGISTERED", { email: user.email }),
					});
					const extUser = user as typeof user & {
						firstName?: string;
						affiliationId?: string;
					};
					void sendEmail("ACCOUNT_CREATED", user.email, {
						firstName: extUser.firstName ?? user.email,
						conferenceName: await getSetting("CONFERENCE_NAME"),
					});
					const contactEmail = await getSetting("CONTACT_EMAIL");
					if (contactEmail) {
						let affiliationName = "";
						if (extUser.affiliationId) {
							const affiliation = await prisma.affiliation.findUnique({
								where: { id: extUser.affiliationId },
								select: { name: true },
							});
							affiliationName = affiliation?.name ?? "";
						}
						void sendEmail("NEW_REGISTRATION_NOTIFY", contactEmail, {
							firstName: extUser.firstName ?? "",
							lastName: user.name ?? "",
							affiliation: affiliationName,
						});
					}
				},
			},
			update: {
				after: async (user) => {
					if (!user.emailVerified) return;
					await linkCoAuthorsByEmail(user.email, user.id);
					// Log self-service email verification (idempotent — checks if already logged)
					const alreadyLogged = await prisma.activityLog.findFirst({
						where: { userId: user.id, type: "USER_EMAIL_VERIFIED" },
					});
					if (!alreadyLogged) {
						await logActivity({
							type: "USER_EMAIL_VERIFIED",
							userId: user.id,
						});
					}
				},
			},
		},
	},
});
