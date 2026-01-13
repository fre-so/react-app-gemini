import {
  motion,
  type MotionValue,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react"
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from "react"

import { cn } from "@/lib/utils"

export type HighlightStepRenderProps = {
  stepIndex: number
  isActive: boolean
  scrollProgress: MotionValue<number>
}

export type HighlightMediaRenderProps = {
  stepIndex: number
  isActive: boolean
  scrollProgress: MotionValue<number>
}

type HighlightStepScrollytellingProps = {
  steps?: number
  mediaSide?: "left" | "right"
  className?: string
  stepClassName?: string
  mediaClassName?: string
  stepRatio?: number
  mediaMinHeight?: string
  stepScrollDistance?: number
  getMediaKey?: (stepIndex: number) => string | number
  StepComponent: ComponentType<HighlightStepRenderProps>
  MediaComponent: ComponentType<HighlightMediaRenderProps>
}

const DEFAULT_STEP_SCROLL_DISTANCE = 400
const DEFAULT_STEP_COUNT = 4
const MAX_STEP_COUNT = 6

type MediaGroup = {
  key: string | number
  startIndex: number
  endIndex: number
  stepIndices: number[]
}

function buildMediaGroups(
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

export default function HighlightStepScrollytelling({
  steps = DEFAULT_STEP_COUNT,
  mediaSide = "right",
  className,
  stepClassName,
  mediaClassName,
  stepRatio = 0.4,
  mediaMinHeight = "70vh",
  stepScrollDistance = DEFAULT_STEP_SCROLL_DISTANCE,
  getMediaKey,
  StepComponent,
  MediaComponent,
}: HighlightStepScrollytellingProps) {
  const sectionRef = useRef<HTMLElement | null>(null)
  const stickyContentRef = useRef<HTMLDivElement | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [stickyTop, setStickyTop] = useState<number | null>(null)
  const isMediaLeft = mediaSide === "left"
  const stepCount = Math.max(0, Math.min(MAX_STEP_COUNT, Math.floor(steps)))
  const normalizedStepRatio =
    typeof stepRatio === "number" && Number.isFinite(stepRatio)
      ? Math.min(Math.max(stepRatio, 0), 1)
      : 0.4
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
    const clampedIndex = Math.min(clamped, 0.9999)
    const nextIndex = Math.min(stepCount - 1, Math.floor(clampedIndex * stepCount))
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
          <div
            ref={stickyContentRef}
            className={cn(
              "flex flex-col gap-10 lg:flex-row lg:items-center",
              isMediaLeft && "lg:flex-row-reverse"
            )}
          >
            <div
              className="w-full space-y-4"
              style={{ flexBasis: 0, flexGrow: computedStepRatio }}
            >
              <ul className="space-y-3">
                {Array.from({ length: stepCount }, (_, index) => {
                  const isActive = index === activeIndex
                  return (
                    <motion.li
                      key={`step-${index}`}
                      className="transition-colors"
                      initial={false}
                      animate={{
                        opacity: isActive ? 1 : 0.55,
                        x: isActive ? 8 : 0,
                      }}
                      transition={{ duration: 0.35, ease: "easeOut" }}
                    >
                      <button
                        type="button"
                        onClick={() => scrollToStep(index)}
                        className={cn(
                          "w-full cursor-pointer rounded-lg border border-border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                          isActive
                            ? "border-l-4 border-l-primary bg-card shadow-sm"
                            : "bg-muted/40 hover:bg-muted/60",
                          stepClassName
                        )}
                        aria-current={isActive ? "step" : undefined}
                      >
                        <StepComponent
                          stepIndex={index}
                          isActive={isActive}
                          scrollProgress={scrollYProgress}
                        />
                      </button>
                    </motion.li>
                  )
                })}
              </ul>
            </div>

            <div className="w-full" style={{ flexBasis: 0, flexGrow: computedMediaRatio }}>
              <div className={cn("relative overflow-hidden", mediaClassName)} style={{ minHeight: mediaMinHeight }}>
                {mediaGroups.map((group) => {
                  const isActive = activeIndex >= group.startIndex && activeIndex <= group.endIndex
                  const inactiveOffset = group.endIndex < activeIndex ? -18 : 18
                  return (
                    <HighlightStepMediaGroup
                      key={`media-${group.startIndex}`}
                      group={group}
                      isActive={isActive}
                      activeStepIndex={activeIndex}
                      inactiveOffset={inactiveOffset}
                      stepCount={stepCount}
                      scrollProgress={scrollYProgress}
                      MediaComponent={MediaComponent}
                    />
                  )
                })}
                <motion.div
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-1.5 bg-primary/60"
                  style={{
                    scaleX: smoothProgress,
                    transformOrigin: "0% 50%",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

type HighlightStepMediaGroupProps = {
  group: MediaGroup
  isActive: boolean
  activeStepIndex: number
  inactiveOffset: number
  stepCount: number
  scrollProgress: MotionValue<number>
  MediaComponent: ComponentType<HighlightMediaRenderProps>
}

function HighlightStepMediaGroup({
  group,
  isActive,
  activeStepIndex,
  inactiveOffset,
  stepCount,
  scrollProgress,
  MediaComponent,
}: HighlightStepMediaGroupProps) {
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
      className="absolute inset-0"
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
