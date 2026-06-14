// Public API for the activity-log feature.
// Isomorphic surface only: the ActivityDetail type + its constructor and the
// display labels. Server logging (logActivity/logActivityTx) imports prisma and
// is reached via the deep `server/activity-log` path to keep it out of the
// client bundle.

export * from "./labels";
export * from "./types";
