import { type Icon, IconChevronDown } from "@tabler/icons-react"
import { useState } from "react"
import type { ReactNode } from "react"
import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible"
import { cn } from "@/shared/lib/utils"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card"

/**
 * Surface treatment. `default` is the flat shadcn Card (rounded-xl + ring);
 * `outlined`/`elevated` mirror the old `Panel` (rounded-2xl + shadow) so the
 * hand-rolled detail/form panels migrate without a visual regression.
 */
type SectionCardVariant = "default" | "outlined" | "elevated"

const VARIANT_CLASS: Record<SectionCardVariant, string> = {
  default: "",
  outlined: "rounded-2xl border border-border/50 shadow-xl ring-0",
  elevated: "rounded-2xl shadow-2xl ring-0",
}

interface BaseSectionCardProps {
  /** Header label. Accepts a node so callers can inline a badge next to the text. */
  title: ReactNode
  /** Leading header icon (rendered `size-5 text-muted-foreground`). */
  icon?: Icon
  /** Optional subtitle under the title. */
  description?: ReactNode
  /** Right-aligned header slot (buttons, links). Never toggles collapse. */
  action?: ReactNode
  variant?: SectionCardVariant
  size?: "default" | "sm"
  className?: string
  headerClassName?: string
  contentClassName?: string
  children: ReactNode
}

interface SectionCardProps extends BaseSectionCardProps {
  /** Opt-in show/hide of the content with a chevron toggle. */
  collapsible?: boolean
  /** Initial open state when `collapsible` (default `true`). */
  defaultOpen?: boolean
}

function HeaderTitle({ icon: HeaderIcon, title }: Pick<BaseSectionCardProps, "icon" | "title">) {
  return (
    <>
      {HeaderIcon ? (
        <HeaderIcon className="size-5 shrink-0 text-muted-foreground" />
      ) : null}
      {title}
    </>
  )
}

function StaticSectionCard({
  title,
  icon,
  description,
  action,
  variant = "default",
  size,
  className,
  headerClassName,
  contentClassName,
  children,
}: BaseSectionCardProps) {
  return (
    <Card size={size} className={cn(VARIANT_CLASS[variant], className)}>
      <CardHeader className={headerClassName}>
        <CardTitle className="flex items-center gap-2 text-base">
          <HeaderTitle icon={icon} title={title} />
        </CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
        {action ? <CardAction>{action}</CardAction> : null}
      </CardHeader>
      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  )
}

function CollapsibleSectionCard({
  title,
  icon,
  description,
  action,
  defaultOpen = true,
  variant = "default",
  size,
  className,
  headerClassName,
  contentClassName,
  children,
}: BaseSectionCardProps & { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <CollapsiblePrimitive.Root
      open={open}
      onOpenChange={setOpen}
      render={<Card size={size} className={cn(VARIANT_CLASS[variant], className)} />}
    >
        <CardHeader
          className={cn(
            "flex flex-row items-start justify-between gap-4",
            headerClassName,
          )}
        >
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <CollapsiblePrimitive.Trigger className="group/section-trigger flex items-center gap-2 rounded-lg text-left text-base font-medium outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
              <HeaderTitle icon={icon} title={title} />
              <IconChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-panel-open/section-trigger:rotate-180" />
            </CollapsiblePrimitive.Trigger>
            {description ? <CardDescription>{description}</CardDescription> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </CardHeader>
        <CollapsiblePrimitive.Panel className="overflow-hidden data-open:animate-collapsible-down data-closed:animate-collapsible-up">
          <CardContent className={contentClassName}>{children}</CardContent>
        </CollapsiblePrimitive.Panel>
    </CollapsiblePrimitive.Root>
  )
}

/**
 * Unified "panel" surface: a {@link Card} with the repeated icon + title header
 * (and optional right-aligned action) baked in, plus an opt-in collapsible body.
 * Renders the same markup as a hand-written `Card`/`CardHeader`/`CardTitle`, so
 * it is a drop-in for the icon+title pattern used across form/detail screens.
 */
export function SectionCard({
  collapsible = false,
  defaultOpen = true,
  ...rest
}: SectionCardProps) {
  return collapsible ? (
    <CollapsibleSectionCard defaultOpen={defaultOpen} {...rest} />
  ) : (
    <StaticSectionCard {...rest} />
  )
}
