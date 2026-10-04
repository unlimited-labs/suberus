import { definePlugin } from "nitro";

// Installs zod's JIT hook before the lazily loaded _ssr chunk builds its schemas.
import "zod/compile";

export default definePlugin(() => {});
