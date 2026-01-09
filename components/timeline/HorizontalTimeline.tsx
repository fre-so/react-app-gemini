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
