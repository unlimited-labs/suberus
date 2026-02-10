import { Project, ts } from "ts-morph";

const project = new Project({ tsConfigFilePath: "tsconfig.json" });

interface DeprecatedUsage {
	file: string;
	line: number;
	col: number;
	name: string;
	message: string;
}

function getDeprecatedTag(symbol: ts.Symbol | undefined): string | undefined {
	if (!symbol) return undefined;

	const tags = symbol.getJsDocTags();
	const dep = tags.find((t: ts.JSDocTagInfo) => t.name === "deprecated");
	if (!dep) return undefined;

	return dep.text?.map((t: ts.SymbolDisplayPart) => t.text).join("") || "(no message)";
}

const usages: DeprecatedUsage[] = [];
const checker = project.getTypeChecker().compilerObject;

for (const sourceFile of project.getSourceFiles()) {
	const filePath = sourceFile.getFilePath();

	if (filePath.includes("node_modules") || filePath.includes(".gen.")) continue;

	sourceFile.forEachDescendant((node) => {
		const compilerNode = node.compilerNode;

		const isIdentifier = ts.isIdentifier(compilerNode);
		const isPropertyAccess = ts.isPropertyAccessExpression(compilerNode);

		if (!isIdentifier && !isPropertyAccess) return;

		// For property access, only check the name part
		if (isPropertyAccess) {
			const nameNode = compilerNode.name;
			const symbol = checker.getSymbolAtLocation(nameNode);
			const msg = getDeprecatedTag(symbol);
			if (msg) {
				const { line, character } = sourceFile.compilerNode.getLineAndCharacterOfPosition(nameNode.getStart());
				usages.push({
					file: filePath,
					line: line + 1,
					col: character + 1,
					name: nameNode.text,
					message: msg,
				});
			}
			return;
		}

		// For identifiers, skip if parent is property access name (handled above)
		if (compilerNode.parent && ts.isPropertyAccessExpression(compilerNode.parent) && compilerNode.parent.name === compilerNode) {
			return;
		}

		const symbol = checker.getSymbolAtLocation(compilerNode);
		const msg = getDeprecatedTag(symbol);
		if (msg) {
			const { line, character } = sourceFile.compilerNode.getLineAndCharacterOfPosition(compilerNode.getStart());
			usages.push({
				file: filePath,
				line: line + 1,
				col: character + 1,
				name: compilerNode.text,
				message: msg,
			});
		}
	});
}

// Deduplicate by file:line:col:name
const seen = new Set<string>();
const unique = usages.filter((u) => {
	const key = `${u.file}:${u.line}:${u.col}:${u.name}`;
	if (seen.has(key)) return false;
	seen.add(key);
	return true;
});

if (unique.length === 0) {
	console.log("No deprecated usages found.");
	process.exit(0);
}

console.log(`Found ${unique.length} deprecated usage(s):\n`);

const grouped = new Map<string, DeprecatedUsage[]>();
for (const u of unique) {
	const list = grouped.get(u.file);
	if (list) list.push(u);
	else grouped.set(u.file, [u]);
}
for (const [file, items] of grouped) {
	console.log(file);
	for (const u of items) {
		console.log(`  ${u.line}:${u.col}  ${u.name}  ${u.message}`);
	}
	console.log();
}

process.exit(1);
