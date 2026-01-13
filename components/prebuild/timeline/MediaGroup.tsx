import { motion, type MotionValue, useTransform } from "motion/react"
import { type ComponentType } from "react"

import { cn } from "@/lib/utils"

import type { MediaGroup, TimelineMediaRenderProps } from "./utils"

type TimelineMediaGroupProps = {
  group: MediaGroup
  isActive: boolean
  activeStepIndex: number
  inactiveOffset: number
  stepCount: number
  scrollProgress: MotionValue<number>
  mediaClassName?: string
  MediaComponent: ComponentType<TimelineMediaRenderProps>
}

export function TimelineMediaGroup({
  group,
  isActive,
  activeStepIndex,
  inactiveOffset,
  stepCount,
  scrollProgress,
  mediaClassName,
  MediaComponent,
}: TimelineMediaGroupProps) {
  const groupProgress = useTransform(scrollProgress, (value) => {
    if (stepCount === 0) return 0
    const scaled = value * stepCount
    const groupSteps = Math.max(group.stepIndices.length, 1)
    const next = (scaled - group.startIndex) / groupSteps
    return Math.max(0, Math.min(next, 1))
  })

  const stepIndex = isActive ? activeStepIndex : group.startIndex

  return (
    <motion.div
      className={cn("absolute inset-0", mediaClassName)}
      initial={false}
      animate={{
        opacity: isActive ? 1 : 0,
        y: isActive ? 0 : inactiveOffset,
      }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      style={{ pointerEvents: isActive ? "auto" : "none" }}
      aria-hidden={!isActive}
    >
      <MediaComponent
        stepIndex={stepIndex}
        isActive={isActive}
        scrollProgress={groupProgress}
      />
    </motion.div>
  )
}
