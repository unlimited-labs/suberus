import { getAuthTables } from "better-auth/db";
import { auth } from "@/features/auth/server/auth.server";

const tables = getAuthTables(auth.options);

for (const [key, table] of Object.entries(tables)) {
	console.log(`\n### ${key}  ->  model "${table.modelName}"`);
	for (const [name, def] of Object.entries(table.fields)) {
		const d = def as Record<string, unknown>;
		const parts = [
			`${name}: ${String(d.type)}`,
			d.required ? "REQUIRED" : "optional",
			d.unique ? "UNIQUE" : "",
			d.index ? "INDEX" : "",
			d.references
				? `-> ${(d.references as { model: string; field: string; onDelete?: string }).model}.${(d.references as { field: string }).field}${(d.references as { onDelete?: string }).onDelete ? ` onDelete=${(d.references as { onDelete?: string }).onDelete}` : ""}`
				: "",
			d.defaultValue !== undefined ? "hasDefault" : "",
		].filter(Boolean);
		console.log("  " + parts.join(" | "));
	}
	if ("indexes" in table && table.indexes) {
		console.log(`  INDEXES: ${JSON.stringify(table.indexes)}`);
	}
}
