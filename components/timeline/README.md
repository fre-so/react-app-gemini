# Timeline Components

Timeline layouts are scroll-driven sequences where a step list stays in sync with a media panel. These components power chronological narratives, milestones, and progress storytelling.

---

## VerticalTimeline
Code Path: `components/timeline/VerticalTimeline.tsx`

### What it looks like / behavior
- Left side: vertical timeline with nodes and a progress line.
- Right side: sticky media panel centered in the viewport.
- Nodes light up as you scroll; media updates with the active step.
- Clicking a node jumps to the corresponding scroll position.

### Use cases
- Chronological narratives, milestones, phase-by-phase stories.
- Richer step content but still with a strong "timeline" feel.

### Usage
```tsx
import { VerticalTimeline } from "@/components/timeline/VerticalTimeline"

const timeline = [
  { year: "2021", title: "Kickoff", media: "/img/t1.png" },
  { year: "2022", title: "Beta", media: "/img/t2.png" },
  { year: "2023", title: "Launch", media: "/img/t3.png" },
  { year: "2024", title: "Scale", media: "/img/t4.png" },
]

function Step({ stepIndex, isActive }: { stepIndex: number; isActive: boolean }) {
  const item = timeline[stepIndex]
  return (
    <div className={isActive ? "text-foreground" : "text-muted-foreground"}>
      <div className="text-xs uppercase tracking-wide">{item.year}</div>
      <div className="mt-1 text-base font-semibold">{item.title}</div>
    </div>
  )
}

function Media({ stepIndex }: { stepIndex: number }) {
  const item = timeline[stepIndex]
  return (
    <img
      src={item.media}
      alt={item.title}
      className="h-full w-full rounded-xl object-cover"
    />
  )
}

export default function Demo() {
  return (
    <VerticalTimeline
      steps={timeline.length}
      stepRatio={0.55}
      stepMinHeight="65vh"
      mediaMinHeight="70vh"
      StepComponent={Step}
      MediaComponent={Media}
    />
  )
}
```

### Scroll progress behavior
- StepComponent `scrollProgress` tracks the *section-level* progress (0-1).
- MediaComponent `scrollProgress` tracks the *media group* progress (0-1).

### Props
- `steps?: number`: step count, default `5`, max `8`.
- `mediaSide?: "left" | "right"`: media position on large screens.
- `className?: string`: section wrapper class.
- `stepClassName?: string`: step content wrapper class.
- `mediaClassName?: string`: media wrapper class.
- `stepRatio?: number`: step column width ratio (0-1), default `0.5`.
- `stepMinHeight?: string`: per-step minimum height, default `"80vh"`.
- `mediaMinHeight?: string`: media minimum height, default `"80vh"`.
- `getMediaKey?: (stepIndex) => string | number`: group adjacent steps by key.
- `StepComponent`: required, renders step content.
- `MediaComponent`: required, renders media content.

---

## HorizontalTimeline
Code Path: `components/timeline/HorizontalTimeline.tsx`

### What it looks like / behavior
- Top: horizontal timeline / step strip with active nodes.
- Bottom: media area synced to the active step.
- Sticky layout keeps focus on the step strip + media combo.
- Clicking a node jumps to the corresponding scroll position.

### Use cases
- Compact timelines with fewer steps.
- Overview-style storytelling where space is limited.

### Usage
```tsx
import { HorizontalTimeline } from "@/components/timeline/HorizontalTimeline"

const phases = [
  { label: "Explore", media: "/img/p1.png" },
  { label: "Validate", media: "/img/p2.png" },
  { label: "Ship", media: "/img/p3.png" },
  { label: "Scale", media: "/img/p4.png" },
]

function Step({ stepIndex, isActive }: { stepIndex: number; isActive: boolean }) {
  const item = phases[stepIndex]
  return (
    <div className={isActive ? "text-foreground" : "text-muted-foreground"}>
      <div className="text-sm font-semibold">{item.label}</div>
    </div>
  )
}

function Media({ stepIndex }: { stepIndex: number }) {
  const item = phases[stepIndex]
  return (
    <img
      src={item.media}
      alt={item.label}
      className="h-full w-full rounded-xl object-cover"
    />
  )
}

export default function Demo() {
  return (
    <HorizontalTimeline
      steps={phases.length}
      stepScrollDistance={320}
      mediaMinHeight="55vh"
      StepComponent={Step}
      MediaComponent={Media}
    />
  )
}
```

### Scroll progress behavior
- StepComponent `scrollProgress` tracks the *section-level* progress (0-1).
- MediaComponent `scrollProgress` tracks the *media group* progress (0-1).

### Props
- `steps?: number`: step count, default `5`, max `8`.
- `stepScrollDistance?: number`: extra scroll distance per step, default `360`. Overall height ~ `100vh + steps * stepScrollDistance`.
- `className?: string`: section wrapper class.
- `stepClassName?: string`: step content wrapper class.
- `mediaClassName?: string`: media wrapper class.
- `mediaMinHeight?: string`: media minimum height, default `"50vh"`.
- `getMediaKey?: (stepIndex) => string | number`: group adjacent steps by key.
- `StepComponent`: required, renders step content.
- `MediaComponent`: required, renders media content.

---

## Shared Concepts

### StepComponent / MediaComponent
All components require two render components:
- `StepComponent`: renders each step's text or card content.
- `MediaComponent`: renders the corresponding media (image, video, chart, map, etc.).

They receive similar render props:

```ts
type RenderProps = {
  stepIndex: number
  isActive: boolean
  scrollProgress: MotionValue<number>
}
```

- `stepIndex`: current step index to read your data.
- `isActive`: whether the step is currently active (for highlighting).
- `scrollProgress`: 0-1 MotionValue for transforms or progress bars.

### getMediaKey (media grouping)
`getMediaKey` groups adjacent steps into a single "media group". The MediaComponent stays mounted within a group, and its `scrollProgress` runs from 0 to 1 across all steps in that group.

Note: only *adjacent* steps with the same key are merged.

```ts
getMediaKey={(index) => (index < 2 ? "intro" : "details")}
```
