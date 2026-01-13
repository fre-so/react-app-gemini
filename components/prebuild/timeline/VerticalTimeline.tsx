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
