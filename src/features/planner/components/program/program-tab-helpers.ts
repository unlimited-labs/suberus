export function llmStatusDotClass(status: string): string {
	if (status === "healthy") return "bg-green-500";
	if (status === "misconfigured") return "bg-yellow-500";
	return "bg-red-500";
}
