import { useEffect, useState, type ComponentType } from "react"
import { useMotionValueEvent } from "motion/react"

import MapRoute, { type Coordinate } from "@/components/maps/MapRoute"
import { HorizontalTimeline } from "@/components/timeline/HorizontalTimeline"
import { VerticalTimeline } from "@/components/timeline/VerticalTimeline"
import type {
  TimelineMediaRenderProps,
  TimelineStepRenderProps,
} from "@/components/timeline/utils"
import { cn } from "@/lib/utils"

type MapTimelineMarkerRenderProps = {
  point: Coordinate
  index: number
  isVisible: boolean
}

export type MapTimelineStepRenderProps = TimelineStepRenderProps & {
  routeItem: Coordinate
  route: ReadonlyArray<Coordinate>
}

export type MapTimelineProps = {
  layout: "vertical" | "horizontal"
  route: ReadonlyArray<Coordinate>
  stepScrollDistance?: number
  mapSide?: "left" | "right"
  stepRatio?: number
  className?: string
  stepClassName?: string
  mapClassName?: string
  StepComponent: ComponentType<MapTimelineStepRenderProps>
  MarkerComponent?: ComponentType<MapTimelineMarkerRenderProps>
}

const MEDIA_KEY = "map-route"
const getMapMediaKey = () => MEDIA_KEY

const clampProgress = (value: number) => Math.min(1, Math.max(0, value))

export function MapTimeline({
  layout,
  route,
  stepScrollDistance,
  mapSide,
  stepRatio,
  className,
  stepClassName,
  mapClassName,
  StepComponent,
  MarkerComponent,
}: MapTimelineProps) {
  const steps = route.length

  function MapTimelineStep(props: TimelineStepRenderProps) {
    const routeItem = route[props.stepIndex]
    if (!routeItem) {
      return null
    }
    return (
      <StepComponent
        {...props}
        routeItem={routeItem}
        route={route}
      />
    )
  }

  function MapTimelineMedia({ scrollProgress }: TimelineMediaRenderProps) {
    const [progress, setProgress] = useState(() =>
      clampProgress(scrollProgress.get())
    )

    useEffect(() => {
      setProgress(clampProgress(scrollProgress.get()))
    }, [scrollProgress])

    useMotionValueEvent(scrollProgress, "change", (latest) => {
      setProgress(clampProgress(latest))
    })

    return (
      <MapRoute
        route={route}
        className={cn("w-full h-full", mapClassName)}
        MarkerComponent={MarkerComponent}
        progress={progress}
      />
    )
  }

  if (layout === "vertical") {
    return (
      <VerticalTimeline
        steps={steps}
        mediaSide={mapSide}
        stepRatio={stepRatio}
        className={className}
        stepClassName={stepClassName}
        getMediaKey={getMapMediaKey}
        StepComponent={MapTimelineStep}
        MediaComponent={MapTimelineMedia}
      />
    )
  }

  return (
    <HorizontalTimeline
      steps={steps}
      stepScrollDistance={stepScrollDistance}
      className={className}
      stepClassName={stepClassName}
      getMediaKey={getMapMediaKey}
      StepComponent={MapTimelineStep}
      MediaComponent={MapTimelineMedia}
    />
  )
}
