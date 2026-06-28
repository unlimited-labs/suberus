import type { Icon } from "@tabler/icons-react"
import type { ReactNode } from "react"

import { cn } from "@/shared/lib/utils"

interface EmptyStateProps {
  /** Leading icon, shown in a muted rounded tile. */
  icon?: Icon
  title: ReactNode
  description?: ReactNode
  /** Optional call-to-action (e.g. an upload button). */
  action?: ReactNode
  className?: string
}

/**
 * Centered empty-state placeholder: dashed surface, optional icon tile,
 * title, muted description and an optional action. Replaces the ad-hoc
 * `border-dashed` boxes scattered across screens.
 */
export function EmptyState({
  icon: EmptyIcon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 px-6 py-12 text-center",
        className,
      )}
    >
      {EmptyIcon ? (
        <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <EmptyIcon className="size-6" />
        </div>
      ) : null}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
