import {
  motion,
  type MotionValue,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react"
import {
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from "react"

import { cn } from "@/lib/utils"

export type StickySideStepRenderProps = {
  stepIndex: number
  isActive: boolean
  scrollProgress: MotionValue<number>
  className?: string
}

export type StickySideMediaRenderProps = {
  stepIndex: number
  isActive: boolean
  scrollProgress: MotionValue<number>
  className?: string
}

type StickySideScrollytellingProps = {
  steps?: number
  mediaSide?: "left" | "right"
  scrollContainerRef?: RefObject<HTMLElement | null>
  className?: string
  stepClassName?: string
  mediaClassName?: string
  stepMinHeight?: string
  mediaMinHeight?: string
  stepRatio?: number
  getMediaKey?: (stepIndex: number) => string | number
  StepComponent: ComponentType<StickySideStepRenderProps>
  MediaComponent: ComponentType<StickySideMediaRenderProps>
}

type MediaGroup = {
  key: string | number
  startIndex: number
  endIndex: number
  stepIndices: number[]
}

const DEFAULT_STEP_COUNT = 5

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

export default function StickySideScrollytelling({
  steps = DEFAULT_STEP_COUNT,
  mediaSide = "right",
  scrollContainerRef,
  className,
  stepClassName,
  mediaClassName,
  stepMinHeight = "80vh",
  mediaMinHeight = "80vh",
  stepRatio = 0.5,
  getMediaKey,
  StepComponent,
  MediaComponent,
}: StickySideScrollytellingProps) {
  const mediaFrameRef = useRef<HTMLDivElement | null>(null)
  const progressMapRef = useRef(new Map<number, MotionValue<number>>())
  const fallbackProgress = useMotionValue(0)
  const [activeIndex, setActiveIndex] = useState(0)
  const [stickyTop, setStickyTop] = useState<number | null>(null)
  const [progressVersion, setProgressVersion] = useState(0)
  const isMediaLeft = mediaSide === "left"
  const stepCount = Math.max(0, Math.floor(steps))
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

  const handleProgressReady = useCallback(
    (index: number, progress: MotionValue<number>) => {
      const stored = progressMapRef.current.get(index)
      if (stored === progress) return
      progressMapRef.current.set(index, progress)
      setProgressVersion((value) => value + 1)
    },
    []
  )

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

  if (stepCount === 0) return null

  return (
    <section className={cn("bg-background text-foreground", className)}>
      <div
        className={cn(
          "mx-auto flex max-w-6xl flex-col gap-12 px-6 py-16 lg:flex-row",
          isMediaLeft && "lg:flex-row-reverse"
        )}
      >
        <div className="space-y-6" style={{ flexBasis: 0, flexGrow: computedStepRatio }}>
          {Array.from({ length: stepCount }, (_, index) => (
            <StepCard
              key={`step-${index}`}
              stepIndex={index}
              isActive={index === activeIndex}
              scrollContainerRef={scrollContainerRef}
              onActive={() => setActiveIndex(index)}
              onProgressReady={handleProgressReady}
              StepComponent={StepComponent}
              stepMinHeight={stepMinHeight}
              stepClassName={stepClassName}
            />
          ))}
        </div>

        <div style={{ flexBasis: 0, flexGrow: computedMediaRatio }}>
          <div
            className="lg:sticky"
            style={{
              top: stickyTop ?? 0,
              visibility: stickyTop === null ? "hidden" : "visible",
            }}
          >
            <div ref={mediaFrameRef} className={cn("relative", mediaClassName)} style={{ minHeight: mediaMinHeight }}>
              {mediaGroups.map((group) => {
                const isActive = activeIndex >= group.startIndex && activeIndex <= group.endIndex
                const inactiveOffset = group.endIndex < activeIndex ? -24 : 24
                return (
                  <StickySideMediaGroup
                    key={`media-${group.startIndex}`}
                    group={group}
                    isActive={isActive}
                    activeStepIndex={activeIndex}
                    inactiveOffset={inactiveOffset}
                    progressMapRef={progressMapRef}
                    progressVersion={progressVersion}
                    fallbackProgress={fallbackProgress}
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

type StickySideMediaGroupProps = {
  group: MediaGroup
  isActive: boolean
  activeStepIndex: number
  inactiveOffset: number
  progressMapRef: RefObject<Map<number, MotionValue<number>>>
  progressVersion: number
  fallbackProgress: MotionValue<number>
  MediaComponent: ComponentType<StickySideMediaRenderProps>
}

function StickySideMediaGroup({
  group,
  isActive,
  activeStepIndex,
  inactiveOffset,
  progressMapRef,
  progressVersion,
  fallbackProgress,
  MediaComponent,
}: StickySideMediaGroupProps) {
  const groupProgress = useMotionValue(0)

  useEffect(() => {
    const stepCount = group.stepIndices.length || 1
    const updateProgress = () => {
      let nextValue = 0

      for (let offset = 0; offset < group.stepIndices.length; offset += 1) {
        const stepIndex = group.stepIndices[offset]
        const progress = progressMapRef.current.get(stepIndex) ?? fallbackProgress
        const rawValue = Math.max(0, Math.min(progress.get(), 1))
        if (offset > 0 && rawValue <= 0) continue

        const scaledValue = (offset + rawValue) / stepCount
        if (scaledValue > nextValue) {
          nextValue = scaledValue
        }
      }

      groupProgress.set(nextValue)
    }

    const unsubscribers = group.stepIndices.map((stepIndex) => {
      const progress = progressMapRef.current.get(stepIndex)
      if (!progress) return null
      return progress.on("change", updateProgress)
    })

    updateProgress()

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe?.())
    }
  }, [fallbackProgress, group, progressMapRef, progressVersion, groupProgress])

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

type StepCardProps = {
  stepIndex: number
  isActive: boolean
  scrollContainerRef?: RefObject<HTMLElement | null>
  onActive: () => void
  onProgressReady: (index: number, progress: MotionValue<number>) => void
  StepComponent: ComponentType<StickySideStepRenderProps>
  stepMinHeight: string
  stepClassName?: string
}

function StepCard({
  stepIndex,
  isActive,
  scrollContainerRef,
  onActive,
  onProgressReady,
  StepComponent,
  stepMinHeight,
  stepClassName,
}: StepCardProps) {
  const cardRef = useRef<HTMLElement | null>(null)
  const { scrollYProgress } = useScroll(
    scrollContainerRef
      ? {
          target: cardRef,
          container: scrollContainerRef,
          offset: ["start end", "end start"],
        }
      : {
          target: cardRef,
          offset: ["start end", "end start"],
        }
  )
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 24,
    mass: 0.2,
  })
  const opacity = useTransform(smoothProgress, [0, 0.3, 0.6, 1], [0, 1, 1, 0])

  useEffect(() => {
    onProgressReady(stepIndex, smoothProgress)
  }, [onProgressReady, smoothProgress, stepIndex])

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    const nextActive = latest > 0.35
    if (nextActive) {
      onActive()
    }
  })

  return (
    <motion.article
      ref={cardRef}
      className="flex flex-col justify-center"
      style={{ opacity, minHeight: stepMinHeight }}
      aria-current={isActive ? "step" : undefined}
    >
      <div className={cn("w-full", stepClassName)}>
        <StepComponent
          stepIndex={stepIndex}
          isActive={isActive}
          scrollProgress={smoothProgress}
        />
      </div>
    </motion.article>
  )
}
