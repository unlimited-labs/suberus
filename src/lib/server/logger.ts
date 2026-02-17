import { createConsola } from "consola";

export const logger = createConsola({
	formatOptions: {
		colors: true,
		date: true,
		columns: 80,
		compact: false,
	},
});
