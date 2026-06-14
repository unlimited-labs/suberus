// Public API for the auth feature. Thin by design: the better-auth server
// instance (server/auth.server) and server helpers are reached via deep path
// only — re-exporting them here would drag createServerFn/better-auth
// registration into any value-import of this barrel (cf. workflow's
// TSS_SERVER_FUNCTION_FACTORY boot crash). Routes deep-import components.
export * from "./api/auth";
