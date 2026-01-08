# Timeline Skill

Timeline layouts are scroll-driven sequences where a step list stays in sync with a media panel. These components power chronological narratives, milestones, and progress storytelling.

---

## VerticalTimeline

### What it looks like / behavior
- Left side: vertical timeline with nodes and a progress line.
- Right side: sticky media panel centered in the viewport.
- Nodes light up as you scroll; media updates with the active step.
- Clicking a node jumps to the corresponding scroll position.

### Use cases
- Chronological narratives, milestones, phase-by-phase stories.
- Richer step content but still with a strong "timeline" feel.

### Component Code
~~~VerticalTimeline.tsx
import { motion, useMotionValueEvent, useScroll, useSpring } from "motion/react"
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from "react"

import { cn } from "@/lib/utils"

import { TimelineMediaGroup } from "./MediaGroup"
import {
  DEFAULT_STEP_COUNT,
  MAX_STEP_COUNT,
  buildMediaGroups,
  type TimelineMediaRenderProps,
  type TimelineStepRenderProps,
} from "./utils"

export type VerticalTimelineProps = {
  steps?: number
  mediaSide?: "left" | "right"
  className?: string
  stepClassName?: string
  mediaClassName?: string
  stepRatio?: number
  stepMinHeight?: string
  mediaMinHeight?: string
  getMediaKey?: (stepIndex: number) => string | number
  StepComponent: ComponentType<TimelineStepRenderProps>
  MediaComponent: ComponentType<TimelineMediaRenderProps>
}

export function VerticalTimeline({
  steps = DEFAULT_STEP_COUNT,
  mediaSide = "right",
  className,
  stepClassName,
  mediaClassName,
  stepRatio = 0.5,
  stepMinHeight = "80vh",
  mediaMinHeight = "80vh",
  getMediaKey,
  StepComponent,
  MediaComponent,
}: VerticalTimelineProps) {
  const sectionRef = useRef<HTMLElement | null>(null)
  const mediaFrameRef = useRef<HTMLDivElement | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [stickyTop, setStickyTop] = useState<number | null>(null)
  const isMediaLeft = mediaSide === "left"
  const stepCount = Math.max(0, Math.min(MAX_STEP_COUNT, Math.floor(steps)))
  const normalizedStepRatio =
    typeof stepRatio === "number" && Number.isFinite(stepRatio)
      ? Math.min(Math.max(stepRatio, 0), 1)
      : 0.5
  const computedStepRatio = normalizedStepRatio
  const computedMediaRatio = 1 - computedStepRatio
  const resolveMediaKey = useCallback(
    (index: number) => (getMediaKey ? getMediaKey(index) : index),
    [getMediaKey]
  )
  const mediaGroups = useMemo(
    () => buildMediaGroups(stepCount, resolveMediaKey),
    [stepCount, resolveMediaKey]
  )

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  })
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 24,
    mass: 0.2,
  })

  useEffect(() => {
    if (typeof window === "undefined") return
    const element = mediaFrameRef.current
    if (!element) return

    const updateStickyTop = () => {
      const rect = element.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const nextTop = Math.max((viewportHeight - rect.height) / 2, 0)
      setStickyTop(nextTop)
    }

    updateStickyTop()

    const resizeObserver = "ResizeObserver" in window ? new ResizeObserver(updateStickyTop) : null
    resizeObserver?.observe(element)
    window.addEventListener("resize", updateStickyTop)

    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener("resize", updateStickyTop)
    }
  }, [])

  useEffect(() => {
    setActiveIndex((prev) => Math.min(prev, Math.max(stepCount - 1, 0)))
  }, [stepCount])

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (!stepCount) return
    const clamped = Math.max(0, Math.min(latest, 1))
    const nextIndex = Math.min(stepCount - 1, Math.floor(clamped * (stepCount - 1)))
    setActiveIndex(nextIndex)
  })

  const scrollToStep = (index: number) => {
    if (typeof window === "undefined") return
    const section = sectionRef.current
    if (!section || !stepCount) return

    const rect = section.getBoundingClientRect()
    const sectionTop = window.scrollY + rect.top
    const scrollRange = section.offsetHeight - window.innerHeight
    if (scrollRange <= 0) return

    const clampedIndex = Math.max(0, Math.min(index, stepCount - 1))
    const targetProgress = (clampedIndex + 0.001) / stepCount
    const targetScroll = sectionTop + targetProgress * scrollRange

    window.scrollTo({ top: targetScroll, behavior: "auto" })
  }

  if (!stepCount) return null

  const lineInset = stepCount > 1 ? `${50 / stepCount}%` : "50%"

  return (
    <section ref={sectionRef} className={cn("bg-background text-foreground", className)}>
      <div
        className={cn(
          "mx-auto flex max-w-6xl flex-col gap-12 px-6 py-16 lg:flex-row",
          isMediaLeft && "lg:flex-row-reverse"
        )}
      >
        <div style={{ flexBasis: 0, flexGrow: computedStepRatio }}>
          <div className="relative">
            <div className="absolute left-3.75 w-0.5 bg-border" style={{ top: lineInset, bottom: lineInset }}>
              <motion.div
                className="h-full w-full bg-primary/70"
                style={{
                  scaleY: smoothProgress,
                  transformOrigin: "0% 0%",
                }}
              />
            </div>
            <ol>
              {Array.from({ length: stepCount }, (_, index) => {
                const isActive = index === activeIndex
                const isPassed = index < activeIndex
                return (
                  <li
                    key={`step-${index}`}
                    className="relative flex items-center"
                    style={{ minHeight: stepMinHeight }}
                  >
                    <button
                      type="button"
                      onClick={() => scrollToStep(index)}
                      className="group relative flex w-full cursor-pointer items-center pl-8 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      aria-current={isActive ? "step" : undefined}
                    >
                      <span
                        className={cn(
                          "absolute left-4 top-1/2 flex h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 transition-colors group-hover:border-primary group-hover:bg-primary",
                          isActive
                            ? "border-primary bg-primary ring-4 ring-primary/20"
                            : isPassed
                              ? "border-primary bg-primary"
                              : "border-muted-foreground/40 bg-background"
                        )}
                      />
                      <div className={cn("w-full", stepClassName)}>
                        <StepComponent
                          stepIndex={index}
                          isActive={isActive}
                          scrollProgress={scrollYProgress}
                        />
                      </div>
                    </button>
                  </li>
                )
              })}
            </ol>
          </div>
        </div>

        <div style={{ flexBasis: 0, flexGrow: computedMediaRatio }}>
          <div
            className="lg:sticky"
            style={{
              top: stickyTop ?? 0,
              visibility: stickyTop === null ? "hidden" : "visible",
            }}
          >
            <div ref={mediaFrameRef} className="relative w-full" style={{ minHeight: mediaMinHeight }}>
              {mediaGroups.map((group) => {
                const isActive = activeIndex >= group.startIndex && activeIndex <= group.endIndex
                const inactiveOffset = group.endIndex < activeIndex ? -24 : 24
                return (
                  <TimelineMediaGroup
                    key={`media-${group.startIndex}`}
                    group={group}
                    isActive={isActive}
                    activeStepIndex={activeIndex}
                    inactiveOffset={inactiveOffset}
                    stepCount={stepCount}
                    scrollProgress={scrollYProgress}
                    mediaClassName={mediaClassName}
                    MediaComponent={MediaComponent}
                  />
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
~~~

---

## HorizontalTimeline

### What it looks like / behavior
- Top: horizontal timeline / step strip with active nodes.
- Bottom: media area synced to the active step.
- Sticky layout keeps focus on the step strip + media combo.
- Clicking a node jumps to the corresponding scroll position.

### Use cases
- Compact timelines with fewer steps.
- Overview-style storytelling where space is limited.

### Component Code
~~~HorizontalTimeline.tsx
import { motion, useMotionValueEvent, useScroll, useSpring } from "motion/react"
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from "react"

import { cn } from "@/lib/utils"

import { TimelineMediaGroup } from "./MediaGroup"
import {
  DEFAULT_STEP_COUNT,
  MAX_STEP_COUNT,
  buildMediaGroups,
  type TimelineMediaRenderProps,
  type TimelineStepRenderProps,
} from "./utils"

export type HorizontalTimelineProps = {
  steps?: number
  stepScrollDistance?: number
  className?: string
  stepClassName?: string
  mediaClassName?: string
  mediaMinHeight?: string
  getMediaKey?: (stepIndex: number) => string | number
  StepComponent: ComponentType<TimelineStepRenderProps>
  MediaComponent: ComponentType<TimelineMediaRenderProps>
}

export function HorizontalTimeline({
  steps = DEFAULT_STEP_COUNT,
  stepScrollDistance = 360,
  className,
  stepClassName,
  mediaClassName,
  mediaMinHeight = "50vh",
  getMediaKey,
  StepComponent,
  MediaComponent,
}: HorizontalTimelineProps) {
  const sectionRef = useRef<HTMLElement | null>(null)
  const stickyContentRef = useRef<HTMLDivElement | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [stickyTop, setStickyTop] = useState<number | null>(null)
  const stepCount = Math.max(0, Math.min(MAX_STEP_COUNT, Math.floor(steps)))
  const resolveMediaKey = useCallback(
    (index: number) => (getMediaKey ? getMediaKey(index) : index),
    [getMediaKey]
  )
  const mediaGroups = useMemo(
    () => buildMediaGroups(stepCount, resolveMediaKey),
    [stepCount, resolveMediaKey]
  )

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  })
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 24,
    mass: 0.2,
  })

  useEffect(() => {
    if (typeof window === "undefined") return
    const element = stickyContentRef.current
    if (!element) return

    const updateStickyTop = () => {
      const rect = element.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const nextTop = Math.max((viewportHeight - rect.height) / 2, 40)
      setStickyTop(nextTop)
    }

    updateStickyTop()

    const resizeObserver = "ResizeObserver" in window ? new ResizeObserver(updateStickyTop) : null
    resizeObserver?.observe(element)
    window.addEventListener("resize", updateStickyTop)

    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener("resize", updateStickyTop)
    }
  }, [])

  useEffect(() => {
    setActiveIndex((prev) => Math.min(prev, Math.max(stepCount - 1, 0)))
  }, [stepCount])

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (!stepCount) return
    const clamped = Math.max(0, Math.min(latest, 1))
    const nextIndex = Math.min(stepCount - 1, Math.floor(clamped * (stepCount - 1)))
    setActiveIndex(nextIndex)
  })

  const scrollToStep = (index: number) => {
    if (typeof window === "undefined") return
    const section = sectionRef.current
    if (!section || !stepCount) return

    const rect = section.getBoundingClientRect()
    const sectionTop = window.scrollY + rect.top
    const scrollRange = section.offsetHeight - window.innerHeight
    if (scrollRange <= 0) return

    const clampedIndex = Math.max(0, Math.min(index, stepCount - 1))
    const targetProgress = (clampedIndex + 0.001) / stepCount
    const targetScroll = sectionTop + targetProgress * scrollRange

    window.scrollTo({ top: targetScroll, behavior: "auto" })
  }

  if (!stepCount) return null

  const totalScrollDistance = stepCount * stepScrollDistance
  const lineInset = stepCount > 1 ? `${50 / stepCount}%` : "50%"

  return (
    <section ref={sectionRef} className={cn("bg-background text-foreground", className)}>
      <div
        className="mx-auto max-w-6xl px-6 py-16"
        style={{ minHeight: `calc(100vh + ${totalScrollDistance}px)` }}
      >
        <div
          className="sticky"
          style={{
            top: stickyTop ?? 40,
            visibility: stickyTop === null ? "hidden" : "visible",
          }}
        >
          <div ref={stickyContentRef} className="flex flex-col gap-8">
            <div className="w-full space-y-6">
              <div className="relative">
                <div className="absolute top-[5px] h-0.5 bg-border" style={{ left: lineInset, right: lineInset }}>
                  <motion.div
                    className="h-full w-full bg-primary/70"
                    style={{
                      scaleX: smoothProgress,
                      transformOrigin: "0% 50%",
                    }}
                  />
                </div>
                <ul className="relative flex items-start justify-between">
                  {Array.from({ length: stepCount }, (_, index) => {
                    const isActive = index === activeIndex
                    const isPassed = index < activeIndex
                    return (
                      <li
                        key={`step-${index}`}
                        className="relative flex flex-1 flex-col items-center text-center"
                      >
                        <button
                          type="button"
                          onClick={() => scrollToStep(index)}
                          className="group flex cursor-pointer flex-col items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                          aria-current={isActive ? "step" : undefined}
                        >
                          <span
                            className={cn(
                              "flex h-3 w-3 items-center justify-center rounded-full border-2 transition-colors group-hover:border-primary group-hover:bg-primary",
                              isActive
                                ? "border-primary bg-primary ring-4 ring-primary/20"
                                : isPassed
                                  ? "border-primary bg-primary"
                                  : "border-muted-foreground/40 bg-background"
                            )}
                          />
                          <div className={cn("w-full", stepClassName)}>
                            <StepComponent
                              stepIndex={index}
                              isActive={isActive}
                              scrollProgress={scrollYProgress}
                            />
                          </div>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>

            <div className="w-full">
              <div className="relative w-full" style={{ minHeight: mediaMinHeight }}>
                {mediaGroups.map((group) => {
                  const isActive = activeIndex >= group.startIndex && activeIndex <= group.endIndex
                  const inactiveOffset = group.endIndex < activeIndex ? -20 : 20
                  return (
                    <TimelineMediaGroup
                      key={`media-${group.startIndex}`}
                      group={group}
                      isActive={isActive}
                      activeStepIndex={activeIndex}
                      inactiveOffset={inactiveOffset}
                      stepCount={stepCount}
                      scrollProgress={scrollYProgress}
                      mediaClassName={mediaClassName}
                      MediaComponent={MediaComponent}
                    />
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
~~~

---

## Shared Code

~~~utils.ts
import type { MotionValue } from "motion/react"

export type TimelineStepRenderProps = {
  stepIndex: number
  isActive: boolean
  scrollProgress: MotionValue<number>
}

export type TimelineMediaRenderProps = {
  stepIndex: number
  isActive: boolean
  scrollProgress: MotionValue<number>
}

export const DEFAULT_STEP_COUNT = 5
export const MAX_STEP_COUNT = 8

export type MediaGroup = {
  key: string | number
  startIndex: number
  endIndex: number
  stepIndices: number[]
}

export function buildMediaGroups(
  stepCount: number,
  getMediaKey: (stepIndex: number) => string | number
) {
  const groups: MediaGroup[] = []

  for (let index = 0; index < stepCount; index += 1) {
    const mediaKey = getMediaKey(index)
    const lastGroup = groups.at(-1)
    if (!lastGroup || lastGroup.key !== mediaKey) {
      groups.push({
        key: mediaKey,
        startIndex: index,
        endIndex: index,
        stepIndices: [index],
      })
      continue
    }

    lastGroup.endIndex = index
    lastGroup.stepIndices.push(index)
  }

  return groups
}
~~~

~~~MediaGroup.tsx
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
~~~