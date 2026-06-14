import { definePlugin } from "nitro";
import { registerServerComposition } from "@/server-composition";

// Wires feature server handlers (domain-event subscribers, email footer) to
// shared infrastructure once at server startup, so shared/server imports no
// feature. Runs in the framework (nitro) tier, which may reach features.
export default definePlugin(() => {
	registerServerComposition();
});
