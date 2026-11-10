import { IconUsers } from "@tabler/icons-react";
import type { ComponentProps } from "react";
import { AuthorsInput } from "@/shared/components/authors-input";
import { isFieldErrorVisible } from "@/shared/hooks/use-field-error";
import type { Author } from "@/shared/types/author";
import { Field, FieldError } from "@/shared/ui/field";

interface AuthorsSectionProps {
	value: Author[];
	onChange: (authors: Author[]) => void;
	meta: {
		isBlurred: boolean;
		errors: NonNullable<ComponentProps<typeof FieldError>["errors"]>;
	};
	submissionAttempts: number;
}

export function AuthorsSection({
	value,
	onChange,
	meta,
	submissionAttempts,
}: AuthorsSectionProps) {
	const hasError = isFieldErrorVisible(meta, submissionAttempts);
	return (
		<div className="space-y-4">
			<div className="flex items-center gap-3">
				<IconUsers className="text-muted-foreground size-5" />
				<h2 className="text-foreground text-lg font-semibold">Authors</h2>
			</div>
			<Field data-invalid={hasError}>
				<AuthorsInput onChange={onChange} value={value} />
				<FieldError errors={hasError ? meta.errors : undefined} />
			</Field>
		</div>
	);
}
