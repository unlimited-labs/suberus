import { createMiddleware } from "@tanstack/react-start";
import chalk from "chalk";
import { createConsola } from "consola";
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
				const ts = new Date().toLocaleTimeString("pl", { hour12: false });
				const tag = logObj.tag ? `[${logObj.tag}] ` : " ";
				const msg = logObj.args.map(String).join(" ");
				colorPrint(logObj.type, `${ts} ${tag}${msg}`);
			},
		},
	],
});

function resolveLabel(method: string, pathname: string) {
	const prefix = "/_serverFn/";
	if (!pathname.startsWith(prefix)) return `[${method}] ${pathname}`;
	try {
		const json = JSON.parse(atob(pathname.slice(prefix.length)));
		const name = (json.export as string).replace(
			/_createServerFn_handler$/,
			"",
		);
		return `[${method}] ${name}`;
	} catch {
		return `[${method}] ${pathname}`;
	}
}

export const loggingMiddleware = createMiddleware().server(
	async ({ request, pathname, next }) => {
		const label = resolveLabel(request.method, pathname);

		const start = Date.now();
		try {
			const result = await next();
			const ms = Date.now() - start;
			if (ms > 500) {
				logger.warn(`${label} - ${ms}ms (slow)`);
			} else {
				logger.debug(`${label} - ${ms}ms`);
			}
			return result;
		} catch (error) {
			const ms = Date.now() - start;
			if (error instanceof Response) {
				logger.debug(`${label} - ${error.status} ${ms}ms`);
			} else {
				logger.error(`${label} - error after ${ms}ms:`, error);
			}
			throw error;
		}
	},
);
