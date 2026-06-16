import chalk from "chalk";
import { createConsola } from "consola";
import { format } from "date-fns";
import { env } from "./env";

const levelBadge: Record<string, (s: string) => string> = {
	error: chalk.bgRed.white,
	fatal: chalk.bgRed.white.bold,
	warn: chalk.bgYellow.black,
	info: chalk.bgCyan.black,
	debug: chalk.bgGray.white,
	log: chalk.bgWhite.black,
	trace: chalk.bgGray.white,
};

function colorPrint(level: string, msg: string) {
	const badge = levelBadge[level] ?? chalk.bgWhite.black;
	const levelTag = badge(` ${level.toUpperCase().padEnd(5)} `);
	process.stdout.write(`${levelTag} ${msg}\n`);
}

export const logger = createConsola({
	level: env.LOG_LEVEL,
	reporters: [
		{
			log(logObj) {
				const ts = format(new Date(), "HH:mm:ss");
				const tag = logObj.tag ? `[${logObj.tag}] ` : " ";
				const msg = logObj.args.map(String).join(" ");
				colorPrint(logObj.type, `${ts} ${tag}${msg}`);
			},
		},
	],
});
