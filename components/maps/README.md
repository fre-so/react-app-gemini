# Maps Skill

This folder contains map-focused UI blocks built on Mapbox GL and the timeline primitives. They are designed for storytelling with routes and step-by-step map progress.

## Requirements
- Set `MAPBOX_API_TOKEN` in your environment (used as `import.meta.env.MAPBOX_API_TOKEN`).
- Routes must use `[longitude, latitude]` pairs.
- Mapbox Directions API is used to fetch a route; this component enforces 2–25 points.

---

## MapRoute
Code Path: `components/maps/MapRoute.tsx`

### What it looks like / behavior
- Renders a Mapbox map with a route line and markers.
- Fetches a driving route from Mapbox Directions API.
- When `progress` is provided, the route line is sliced and markers appear as progress passes their thresholds.
- When `progress` is omitted, the full route is displayed.

### Use cases
- Standalone route visualization.
- Progressive reveal of a route in sync with scroll or playback.
- Embedding inside a scrollytelling layout (see MapTimeline).

### Usage
```tsx
import MapRoute, { type Coordinate } from "@/components/maps/MapRoute"

const route: Coordinate[] = [
  [116.391, 39.907],
  [116.397, 39.908],
  [116.403, 39.915],
  [116.410, 39.920],
]

export default function Demo() {
  return <MapRoute route={route} />
}
```

With progress control:
```tsx
import { useState } from "react"
import MapRoute, { type Coordinate } from "@/components/maps/MapRoute"

const route: Coordinate[] = [
  [116.391, 39.907],
  [116.397, 39.908],
  [116.403, 39.915],
  [116.410, 39.920],
]

export default function Demo() {
  const [progress, setProgress] = useState(0.5)
  return <MapRoute route={route} progress={progress} />
}
```

### Props
- `route: ReadonlyArray<Coordinate>`: required. Coordinate = `[longitude, latitude]`. Must be 2–25 points.
- `className?: string`: wrapper class for the map container.
- `MarkerComponent?: ComponentType<MapRouteMarkerRenderProps>`: custom marker UI. Receives `{ point, index, isVisible }`.
- `StatusBadgeComponent?: ComponentType<MapRouteStatusRenderProps>`: custom status badge UI. Receives `{ label, isLoading }`.
- `EmptyStateComponent?: ComponentType<MapRouteEmptyStateRenderProps>`: custom empty state UI. Receives `{ message }`.
- `progress?: number`: 0–1 to reveal the route progressively. If omitted, the full route is shown.

### Notes
- When `MAPBOX_API_TOKEN` is missing, the component renders an empty state message.
- If coordinates are invalid or fewer than two, an error state is shown.

---

## MapTimeline
Code Path: `components/maps/MapTimeline.tsx`

### What it looks like / behavior
- A scrollytelling timeline (vertical or horizontal) paired with a sticky map.
- The map is always one media group, and the route reveals as scroll progress increases.
- Each step corresponds to one coordinate in the route.

### Use cases
- Storytelling along a journey or delivery route.
- Showing progress across locations with narrative steps.
- Combining a map with timeline-style copy.

### Usage
```tsx
import { MapTimeline } from "@/components/maps/MapTimeline"
import type { Coordinate } from "@/components/maps/MapRoute"

const route: Coordinate[] = [
  [116.391, 39.907],
  [116.397, 39.908],
  [116.403, 39.915],
  [116.410, 39.920],
]

function Step({ stepIndex, routeItem }: { stepIndex: number; routeItem: Coordinate }) {
  return (
    <div>
      <div className="text-sm font-semibold">Stop {stepIndex + 1}</div>
      <div className="text-xs text-muted-foreground">
        {routeItem[0].toFixed(3)}, {routeItem[1].toFixed(3)}
      </div>
    </div>
  )
}

export default function Demo() {
  return (
    <MapTimeline
      layout="vertical"
      route={route}
      mapSide="right"
      stepRatio={0.5}
      StepComponent={Step}
    />
  )
}
```

### Props
- `layout: "vertical" | "horizontal"`: required. Chooses the timeline layout.
- `route: ReadonlyArray<Coordinate>`: required. Coordinates for the route and steps (2+ recommended).
- `stepScrollDistance?: number`: only used for `layout="horizontal"`. Controls overall scroll length.
- `mapSide?: "left" | "right"`: only used for `layout="vertical"`. Map position on large screens.
- `stepRatio?: number`: only used for `layout="vertical"`. Step column width ratio (0–1).
- `className?: string`: wrapper class for the timeline section.
- `stepClassName?: string`: wrapper class for each step content.
- `mapClassName?: string`: wrapper class for the map container.
- `StepComponent: ComponentType<MapTimelineStepRenderProps>`: required. Receives timeline props plus `{ routeItem, route }`.
- `MarkerComponent?: ComponentType<MapTimelineMarkerRenderProps>`: optional map marker UI. Receives `{ point, index, isVisible }`.

### Notes
- MapTimeline uses MapRoute internally, so `MAPBOX_API_TOKEN` is required.
- Each step corresponds to one coordinate in the route.
