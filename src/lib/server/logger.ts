import { createConsola } from "consola";

export const logger = createConsola({
	formatOptions: {
		// colors: true,
		date: true,
		columns: 0,
		compact: false,
	},
});

logger.wrapAll();
