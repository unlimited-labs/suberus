/** Minimal track shape the submissions feature needs (id + name for selectors).
 * Tracks are an external feature; submissions receives this data via route
 * props rather than importing the tracks feature directly. */
export type AvailableTrack = { id: string; name: string };
