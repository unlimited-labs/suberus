import { useState, useCallback, type KeyboardEvent } from "react"
import { IconX, IconPlus } from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

interface KeywordsInputProps {
	value: string[]
	onChange: (keywords: string[]) => void
	maxKeywords?: number
	placeholder?: string
	className?: string
}

export function KeywordsInput({
	value,
	onChange,
	maxKeywords = 5,
	placeholder = "",
	className,
}: KeywordsInputProps) {
	const [inputValue, setInputValue] = useState("")
	const [error, setError] = useState<string | null>(null)

	const addKeyword = useCallback(
		(keyword: string) => {
			const trimmed = keyword.trim().toLowerCase()

			if (!trimmed) {
				return
			}

			if (value.length >= maxKeywords) {
				setError(`Maximum ${maxKeywords} keywords allowed`)
				return
			}

			if (value.includes(trimmed)) {
				setError("Keyword already added")
				return
			}

			onChange([...value, trimmed])
			setInputValue("")
			setError(null)
		},
		[value, onChange, maxKeywords]
	)

	const removeKeyword = useCallback(
		(keyword: string) => {
			onChange(value.filter((k) => k !== keyword))
			setError(null)
		},
		[value, onChange]
	)

	const handleKeyDown = useCallback(
		(e: KeyboardEvent<HTMLInputElement>) => {
			if (e.key === "Enter") {
				e.preventDefault()
				addKeyword(inputValue)
			} else if (e.key === "Backspace" && !inputValue && value.length > 0) {
				removeKeyword(value[value.length - 1])
			}
		},
		[inputValue, value, addKeyword, removeKeyword]
	)

	return (
		<div className={cn("space-y-3", className)}>
			<div className="flex items-center gap-2">
				<Input
					type="text"
					value={inputValue}
					onChange={(e) => {
						setInputValue(e.target.value)
						setError(null)
					}}
					onKeyDown={handleKeyDown}
					placeholder={placeholder}
					disabled={value.length >= maxKeywords}
					className="flex-1 text-foreground"
				/>
				<button
					type="button"
					onClick={() => addKeyword(inputValue)}
					disabled={!inputValue.trim() || value.length >= maxKeywords}
					className={cn(
						"flex-shrink-0 p-2 rounded-lg border transition-colors",
						"disabled:opacity-50 disabled:cursor-not-allowed",
						"hover:bg-primary hover:text-primary-foreground hover:border-primary",
						"border-border bg-background"
					)}
					aria-label="Add keyword"
				>
					<IconPlus className="size-4" />
				</button>
			</div>

			{value.length > 0 && (
				<div className="flex flex-wrap gap-2">
					{value.map((keyword) => (
						<Badge
							key={keyword}
							variant="secondary"
							className="pl-2.5 pr-1.5 py-1 gap-1.5 font-normal"
						>
							<span>{keyword}</span>
							<button
								type="button"
								onClick={() => removeKeyword(keyword)}
								className="rounded hover:bg-foreground/20 p-0.5 transition-colors"
								aria-label={`Remove ${keyword}`}
							>
								<IconX className="size-3" />
							</button>
						</Badge>
					))}
				</div>
			)}

			{error && (
				<p className="text-xs text-destructive" role="alert">
					{error}
				</p>
			)}

			<p className="text-xs text-muted-foreground">
				{value.length} / {maxKeywords} keywords
			</p>
		</div>
	)
}
