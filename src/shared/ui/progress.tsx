import { Progress as ProgressPrimitive } from "@base-ui/react/progress"

import { cn } from "@/shared/lib/utils"

function Progress({
  className,
  value,
  ...props
}: ProgressPrimitive.Root.Props) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      value={value}
      className="w-full"
      {...props}
    >
      <ProgressPrimitive.Track
        data-slot="progress-track"
        className={cn(
          "bg-muted h-1 rounded-full relative flex w-full items-center overflow-x-hidden",
          className
        )}
      >
        <ProgressPrimitive.Indicator
          data-slot="progress-indicator"
          className="bg-primary h-full transition-[width]"
        />
      </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
  )
}

export { Progress }
