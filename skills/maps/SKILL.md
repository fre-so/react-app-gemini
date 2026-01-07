# Maps Skill

This folder contains map-focused UI blocks built on Mapbox GL and the timeline primitives. They are designed for storytelling with routes and step-by-step map progress.

## Requirements
- Set `MAPBOX_API_TOKEN` in your environment (used as `import.meta.env.MAPBOX_API_TOKEN`).
- Routes must use `[longitude, latitude]` pairs.
- Mapbox Directions API is used to fetch a route; this component enforces 2–25 points.

---

## MapRoute

### What it looks like / behavior
- Renders a Mapbox map with a route line and markers.
- Fetches a driving route from Mapbox Directions API.
- When `progress` is provided, the route line is sliced and markers appear as progress passes their thresholds.
- When `progress` is omitted, the full route is displayed.

### Use cases
- Standalone route visualization.
- Progressive reveal of a route in sync with scroll or playback.
- Embedding inside a scrollytelling layout (see MapTimeline).

### Component Code

~~~MapRoute.tsx
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ComponentType,
} from "react"
import Map, {
  Layer,
  Marker,
  Source,
  type LngLatBoundsLike,
  type MapRef,
} from "react-map-gl/mapbox"
import type { FeatureCollection, LineString } from "geojson"
import type { Marker as MapboxMarker } from "mapbox-gl"
import { AnimatePresence, animate, usePresence } from "motion/react"
import { cn } from "@/lib/utils"

import "mapbox-gl/dist/mapbox-gl.css"

type LngLat = [number, number]

export type Coordinate = [number, number]

type ParsedCoordinates = {
  points: LngLat[]
  serialized: string
  error: string | null
}

type MapRouteMarkerRenderProps = {
  point: LngLat
  index: number
  isVisible: boolean
}

type MapRouteStatusRenderProps = {
  label: string
  isLoading: boolean
}

type MapRouteEmptyStateRenderProps = {
  message: string
}

type DirectionsResponse = {
  routes: Array<{
    geometry: LineString
  }>
  message?: string
}

type MapRouteProps = {
  route: ReadonlyArray<Coordinate>
  className?: string
  MarkerComponent?: ComponentType<MapRouteMarkerRenderProps>
  StatusBadgeComponent?: ComponentType<MapRouteStatusRenderProps>
  EmptyStateComponent?: ComponentType<MapRouteEmptyStateRenderProps>
  progress?: number
}

const normalizeCoordinates = (
  coordinates: ReadonlyArray<Coordinate>
): ParsedCoordinates => {
  if (coordinates.length < 2 || coordinates.length > 25) {
    return {
      points: [],
      serialized: "",
      error: "Provide between two and 25 coordinate pairs.",
    }
  }

  const points: LngLat[] = []
  for (const coordinate of coordinates) {
    if (!Array.isArray(coordinate) || coordinate.length !== 2) {
      return {
        points: [],
        serialized: "",
        error: "Each coordinate must be [longitude, latitude].",
      }
    }

    const [lngValue, latValue] = coordinate
    const lng = Number(lngValue)
    const lat = Number(latValue)
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
      return {
        points: [],
        serialized: "",
        error: "Longitude and latitude must be valid numbers.",
      }
    }
    if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
      return {
        points: [],
        serialized: "",
        error: "Longitude or latitude is out of range.",
      }
    }

    points.push([lng, lat])
  }

  return {
    points,
    serialized: points.map(([lng, lat]) => `${lng},${lat}`).join(";"),
    error: null,
  }
}

const buildFeatureCollection = (
  geometry: LineString
): FeatureCollection<LineString> => ({
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {},
      geometry,
    },
  ],
})

const clampProgress = (value: number) => Math.min(1, Math.max(0, value))

const sliceRouteByProgress = (coordinates: LngLat[], progress: number) => {
  if (coordinates.length === 0) {
    return []
  }

  const clamped = clampProgress(progress)
  if (clamped <= 0) {
    return [coordinates[0]]
  }
  if (clamped >= 1) {
    return coordinates
  }

  let totalLength = 0
  for (let i = 1; i < coordinates.length; i += 1) {
    const [prevLng, prevLat] = coordinates[i - 1]
    const [nextLng, nextLat] = coordinates[i]
    totalLength += Math.hypot(nextLng - prevLng, nextLat - prevLat)
  }

  if (totalLength === 0) {
    return [coordinates[0]]
  }

  const targetLength = totalLength * clamped
  let traveled = 0
  const sliced: LngLat[] = [coordinates[0]]

  for (let i = 1; i < coordinates.length; i += 1) {
    const [prevLng, prevLat] = coordinates[i - 1]
    const [nextLng, nextLat] = coordinates[i]
    const segmentLength = Math.hypot(nextLng - prevLng, nextLat - prevLat)
    if (segmentLength === 0) {
      continue
    }

    if (traveled + segmentLength >= targetLength) {
      const remaining = targetLength - traveled
      const ratio = remaining / segmentLength
      sliced.push([
        prevLng + (nextLng - prevLng) * ratio,
        prevLat + (nextLat - prevLat) * ratio,
      ])
      break
    }

    traveled += segmentLength
    sliced.push([nextLng, nextLat])
  }

  return sliced
}

const getRouteLengthInfo = (coordinates: LngLat[]) => {
  const cumulativeLengths: number[] = []
  let totalLength = 0

  for (let i = 0; i < coordinates.length; i += 1) {
    if (i === 0) {
      cumulativeLengths.push(0)
      continue
    }
    const [prevLng, prevLat] = coordinates[i - 1]
    const [nextLng, nextLat] = coordinates[i]
    totalLength += Math.hypot(nextLng - prevLng, nextLat - prevLat)
    cumulativeLengths.push(totalLength)
  }

  return { cumulativeLengths, totalLength }
}

const getRouteItemProgress = (routeLine: LngLat[], routeItems: LngLat[]) => {
  if (routeItems.length === 0) {
    return []
  }
  if (routeLine.length === 0) {
    return routeItems.map(() => 0)
  }

  const { cumulativeLengths, totalLength } = getRouteLengthInfo(routeLine)
  if (!Number.isFinite(totalLength) || totalLength <= 0) {
    return routeItems.map((_, index) => (index === 0 ? 0 : 1))
  }

  let searchStart = 0
  const thresholds = routeItems.map((point) => {
    let bestIndex = searchStart
    let bestDistance = Number.POSITIVE_INFINITY

    for (let i = searchStart; i < routeLine.length; i += 1) {
      const [lng, lat] = routeLine[i]
      const distance = Math.hypot(point[0] - lng, point[1] - lat)
      if (distance < bestDistance) {
        bestDistance = distance
        bestIndex = i
      }
    }

    searchStart = bestIndex
    const lengthAt = cumulativeLengths[bestIndex] ?? totalLength
    return clampProgress(lengthAt / totalLength)
  })

  thresholds[0] = 0
  thresholds[thresholds.length - 1] = 1
  return thresholds
}

const getRouteMeta = (coordinates: LngLat[]) => {
  if (coordinates.length === 0) {
    return null
  }

  let minLng = coordinates[0][0]
  let maxLng = coordinates[0][0]
  let minLat = coordinates[0][1]
  let maxLat = coordinates[0][1]

  for (const [lng, lat] of coordinates) {
    minLng = Math.min(minLng, lng)
    maxLng = Math.max(maxLng, lng)
    minLat = Math.min(minLat, lat)
    maxLat = Math.max(maxLat, lat)
  }

  const bounds: LngLatBoundsLike = [
    [minLng, minLat],
    [maxLng, maxLat],
  ]

  return {
    bounds,
    center: {
      longitude: (minLng + maxLng) / 2,
      latitude: (minLat + maxLat) / 2,
    },
  }
}

type RouteMarkerProps = {
  point: LngLat
  index: number
  renderContent: (point: LngLat, index: number) => ReactElement | null
}

const RouteMarker = ({ point, index, renderContent }: RouteMarkerProps) => {
  const markerRef = useRef<MapboxMarker | null>(null)
  const [isPresent, safeToRemove] = usePresence()

  useEffect(() => {
    const marker = markerRef.current
    if (!marker) {
      return
    }
    const element = marker.getElement()
    element.style.opacity = "0"
    element.style.marginTop = "-8px"
    const controls = animate(
      element,
      { opacity: 1, marginTop: "0px" },
      { duration: 0.35, ease: "easeOut" }
    )
    return () => controls.stop()
  }, [])

  useEffect(() => {
    if (isPresent) {
      return
    }
    const marker = markerRef.current
    if (!marker) {
      safeToRemove?.()
      return
    }
    const element = marker.getElement()
    const controls = animate(
      element,
      { opacity: 0 },
      { duration: 0.2, ease: "easeIn" }
    )
    controls.finished.then(() => safeToRemove?.())
    return () => controls.stop()
  }, [isPresent, safeToRemove])

  return (
    <Marker
      ref={markerRef}
      longitude={point[0]}
      latitude={point[1]}
      anchor="bottom"
    >
      {renderContent(point, index)}
    </Marker>
  )
}

export default function MapRoute({
  route,
  className,
  MarkerComponent,
  StatusBadgeComponent,
  EmptyStateComponent,
  progress,
}: MapRouteProps) {
  const mapboxToken = import.meta.env.MAPBOX_API_TOKEN as string | undefined
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MapRef | null>(null)
  const [isMapReady, setIsMapReady] = useState(false)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const [routeData, setRouteData] =
    useState<FeatureCollection<LineString> | null>(null)
  const [routeError, setRouteError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [animatedProgress, setAnimatedProgress] = useState(() =>
    progress == null ? 1 : clampProgress(progress)
  )
  const animatedProgressRef = useRef(animatedProgress)

  const parsedRoute = useMemo(() => normalizeCoordinates(route), [route])

  const fetchedRouteCoordinates = useMemo(() => {
    const coordinates = routeData?.features?.[0]?.geometry?.coordinates
    if (!coordinates?.length) {
      return null
    }
    return coordinates.map((point) => [point[0], point[1]] as LngLat)
  }, [routeData])

  const routeCoordinates = fetchedRouteCoordinates ?? parsedRoute.points

  const routeMeta = useMemo(() => {
    return getRouteMeta(routeCoordinates)
  }, [routeCoordinates])

  const displayProgress = progress == null ? 1 : animatedProgress
  const clampedProgress = clampProgress(displayProgress)
  const routeItemProgress = useMemo(
    () => getRouteItemProgress(routeCoordinates, parsedRoute.points),
    [parsedRoute.points, routeCoordinates]
  )

  const visibleRouteData = useMemo(() => {
    if (!routeData || !fetchedRouteCoordinates) {
      return null
    }
    if (progress == null) {
      return routeData
    }
    const sliced = sliceRouteByProgress(
      fetchedRouteCoordinates,
      clampedProgress
    )
    if (sliced.length < 2) {
      return null
    }
    const geometry: LineString = { type: "LineString", coordinates: sliced }
    return buildFeatureCollection(geometry)
  }, [clampedProgress, fetchedRouteCoordinates, progress, routeData])

  const renderEmptyStateContent = (message: string) => {
    if (EmptyStateComponent) {
      return <EmptyStateComponent message={message} />
    }
    return (
      <div
        className={cn(
          "flex h-130 w-full items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 text-sm text-muted-foreground",
          className
        )}
      >
        {message}
      </div>
    )
  }

  const renderMarkerContent = (
    point: LngLat,
    index: number,
    isVisible: boolean
  ) => {
    if (MarkerComponent) {
      return (
        <MarkerComponent point={point} index={index} isVisible={isVisible} />
      )
    }
    return null
  }

  useEffect(() => {
    if (!mapboxToken || parsedRoute.error) {
      setRouteData(null)
      setRouteError(null)
      setIsLoading(false)
      return
    }
    if (parsedRoute.points.length < 2) {
      setRouteData(null)
      setRouteError("Provide at least two coordinates.")
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    const fetchRoute = async () => {
      setIsLoading(true)
      setRouteError(null)
      setRouteData(null)

      try {
        const url = new URL(
          `https://api.mapbox.com/directions/v5/mapbox/driving/${parsedRoute.serialized}`
        )
        url.searchParams.set("geometries", "geojson")
        url.searchParams.set("overview", "full")
        url.searchParams.set("steps", "false")
        url.searchParams.set("access_token", mapboxToken)

        const response = await fetch(url.toString(), {
          signal: controller.signal,
        })
        if (!response.ok) {
          throw new Error(`Directions API error: ${response.status}`)
        }
        const data = (await response.json()) as DirectionsResponse
        const geometry = data.routes?.[0]?.geometry
        if (!geometry?.coordinates?.length) {
          throw new Error(data.message || "No route data returned.")
        }

        setRouteData(buildFeatureCollection(geometry))
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return
        }
        const message =
          error instanceof Error
            ? error.message
            : "Failed to load directions."
        setRouteError(message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchRoute()
    return () => controller.abort()
  }, [
    mapboxToken,
    parsedRoute.error,
    parsedRoute.points.length,
    parsedRoute.serialized,
  ])

  useEffect(() => {
    animatedProgressRef.current = animatedProgress
  }, [animatedProgress])

  useEffect(() => {
    if (progress == null) {
      if (animatedProgressRef.current !== 1) {
        setAnimatedProgress(1)
      }
      return
    }

    const target = clampProgress(progress)
    const start = animatedProgressRef.current
    if (start === target) {
      return
    }

    const duration = 500
    const startTime = performance.now()
    let frameId = 0

    const step = (timestamp: number) => {
      const elapsed = timestamp - startTime
      const progressValue = Math.min(1, elapsed / duration)
      const eased = 1 - Math.pow(1 - progressValue, 3)
      setAnimatedProgress(start + (target - start) * eased)
      if (progressValue < 1) {
        frameId = requestAnimationFrame(step)
      }
    }

    frameId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frameId)
  }, [progress])

  useEffect(() => {
    const node = containerRef.current
    if (!node) {
      return
    }
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) {
        return
      }
      const { width, height } = entry.contentRect
      setContainerSize((prev) => {
        const nextWidth = Math.round(width)
        const nextHeight = Math.round(height)
        if (prev.width === nextWidth && prev.height === nextHeight) {
          return prev
        }
        return { width: nextWidth, height: nextHeight }
      })
    })

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!isMapReady || !mapRef.current || !routeMeta) {
      return
    }
    if (containerSize.width === 0 || containerSize.height === 0) {
      return
    }
    const padding = {
      top: Math.round(containerSize.height * 0.1),
      bottom: Math.round(containerSize.height * 0.1),
      left: Math.round(containerSize.width * 0.1),
      right: Math.round(containerSize.width * 0.1),
    }
    mapRef.current.fitBounds(routeMeta.bounds, {
      padding,
      duration: 800,
      maxZoom: 6,
    })
  }, [
    containerSize.height,
    containerSize.width,
    isMapReady,
    routeMeta,
  ])

  if (!mapboxToken) {
    return renderEmptyStateContent("Missing MAPBOX_API_TOKEN in .env")
  }

  if (parsedRoute.error) {
    return renderEmptyStateContent(parsedRoute.error)
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative h-130 w-full overflow-hidden rounded-lg border border-border",
        className
      )}
    >
      <Map
        ref={mapRef}
        mapboxAccessToken={mapboxToken}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        initialViewState={{
          longitude: routeMeta?.center?.longitude ?? 0,
          latitude: routeMeta?.center?.latitude ?? 0,
          zoom: routeMeta ? 4 : 1,
        }}
        onLoad={() => setIsMapReady(true)}
        scrollZoom={false}
        reuseMaps
        style={{ width: "100%", height: "100%" }}
      >
        {visibleRouteData ? (
          <Source id="route" type="geojson" data={visibleRouteData}>
            <Layer
              id="route-outline"
              type="line"
              paint={{
                "line-color": "#f8fafc",
                "line-width": 8,
                "line-opacity": 0.9,
              }}
            />
            <Layer
              id="route-line"
              type="line"
              paint={{
                "line-color": "#0f172a",
                "line-width": 4,
                "line-opacity": 0.9,
              }}
            />
          </Source>
        ) : null}

        <AnimatePresence>
          {parsedRoute.points.map((point, index) => {
            const threshold = routeItemProgress[index] ?? 0
            const isVisible = clampedProgress >= threshold
            if (!isVisible) {
              return null
            }

            return (
              <RouteMarker
                key={`${point[0]}-${point[1]}-${index}`}
                point={point}
                index={index}
                renderContent={(targetPoint, targetIndex) =>
                  renderMarkerContent(targetPoint, targetIndex, true)
                }
              />
            )
          })}
        </AnimatePresence>
      </Map>

      {isLoading || routeError ? (
        StatusBadgeComponent ? (
          <StatusBadgeComponent
            label={routeError ?? "Loading route..."}
            isLoading={isLoading}
          />
        ) : (
          <div
            className={cn(
              "absolute right-4 top-4 rounded-full bg-background/90 px-3 py-1 text-xs font-semibold text-foreground shadow"
            )}
          >
            {routeError ?? "Loading route..."}
          </div>
        )
      ) : null}
    </div>
  )
}
~~~

---

## MapTimeline

### What it looks like / behavior
- A scrollytelling timeline (vertical or horizontal) paired with a sticky map.
- The map is always one media group, and the route reveals as scroll progress increases.
- Each step corresponds to one coordinate in the route.

### Use cases
- Storytelling along a journey or delivery route.
- Showing progress across locations with narrative steps.
- Combining a map with timeline-style copy.

### Component Code

~~~MapTimeline.tsx
import { useEffect, useState, type ComponentType } from "react"
import { useMotionValueEvent } from "motion/react"

import MapRoute, { type Coordinate } from "./MapRoute"
import { HorizontalTimeline } from "../timeline/HorizontalTimeline"
import { VerticalTimeline } from "../timeline/VerticalTimeline"
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
~~~