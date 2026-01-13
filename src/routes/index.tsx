import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button.tsx";

export const Route = createFileRoute("/")({ component: App });

function App() {
	return (
		<div className="min-h-screen flex flex-col items-center justify-center">
			<div className="font-medium">
				<Button>Hello World</Button>
			</div>
		</div>
	);
}
