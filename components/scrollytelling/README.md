# Scrollytelling Components

Scrollytelling is a scroll-driven narrative pattern: content advances step by step while a visual area (media/graphics/illustrations) stays in sync. It helps readers digest information at a controlled pace and keeps attention anchored on the story.

## StickySideScrollytelling
Code Path: `components/scrollytelling/StickySide.tsx`

### What it looks like / behavior
- Left column: tall vertical steps, each occupying generous vertical space.
- Right column: a sticky media panel centered in the viewport.
- Active steps switch media with subtle motion between groups.

### Use cases
- Long-form narratives (case studies, product stories).
- Rich text per step and relaxed scrolling rhythm.
- Media should stay in view as a stable visual anchor.

### Usage
```tsx
import StickySideScrollytelling from "@/components/scrollytelling/StickySide"

const data = [
  { title: "Find the issue", body: "Users drop on step 2.", media: "/img/01.png" },
  { title: "Locate cause", body: "Heatmap shows low visibility.", media: "/img/02.png" },
  { title: "Propose fix", body: "Adjust layout and copy.", media: "/img/03.png" },
  { title: "Result", body: "Conversion up 18%.", media: "/img/04.png" },
]

function Step({ stepIndex, isActive }: { stepIndex: number; isActive: boolean }) {
  const item = data[stepIndex]
  return (
    <div className={isActive ? "text-foreground" : "text-muted-foreground"}>
      <h3 className="text-lg font-semibold">{item.title}</h3>
      <p className="mt-2 text-sm">{item.body}</p>
    </div>
  )
}

function Media({ stepIndex }: { stepIndex: number }) {
  const item = data[stepIndex]
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
    <StickySideScrollytelling
      steps={data.length}
      mediaSide="right"
      stepMinHeight="70vh"
      mediaMinHeight="75vh"
      StepComponent={Step}
      MediaComponent={Media}
    />
  )
}
```

### Scroll progress behavior
- StepComponent `scrollProgress` tracks the *individual card* progress (0 when entering view, 1 when leaving).
- MediaComponent `scrollProgress` tracks the *media group* progress across grouped steps.

### Props
- `steps?: number`: step count, default `5`. Match your data length.
- `mediaSide?: "left" | "right"`: media column position on large screens.
- `scrollContainerRef?: RefObject<HTMLElement | null>`: pass a scroll container ref if using a non-window scroller.
- `className?: string`: section wrapper class.
- `stepClassName?: string`: wrapper class for each step.
- `mediaClassName?: string`: wrapper class for media area.
- `stepMinHeight?: string`: per-step minimum height, default `"80vh"`.
- `mediaMinHeight?: string`: media panel minimum height, default `"80vh"`.
- `stepRatio?: number`: step column width ratio (0–1). Media uses `1 - stepRatio`.
- `getMediaKey?: (stepIndex) => string | number`: group adjacent steps by key.
- `StepComponent`: required, renders step content.
- `MediaComponent`: required, renders media content.

---

## HighlightStepScrollytelling
Code Path: `components/scrollytelling/HighlightStep.tsx`

### What it looks like / behavior
- Left side: compact, clickable step list.
- Right side: media panel that swaps with scroll.
- Active step is highlighted and slightly offset.
- A progress bar at the bottom shows overall scroll progress.

### Use cases
- Short, glanceable sequences (feature highlights, quick flows).
- Step list doubles as navigation and status indicator.
- Landing page sections that need compact storytelling.

### Usage
```tsx
import HighlightStepScrollytelling from "@/components/scrollytelling/HighlightStep"

const items = [
  { title: "Connect data", desc: "Select sources and permissions.", media: "/img/a.png" },
  { title: "Clean up", desc: "Auto dedupe and fix anomalies.", media: "/img/b.png" },
  { title: "Generate insights", desc: "Key metrics summarized.", media: "/img/c.png" },
  { title: "Share", desc: "One-click export.", media: "/img/d.png" },
]

function Step({ stepIndex, isActive }: { stepIndex: number; isActive: boolean }) {
  const item = items[stepIndex]
  return (
    <div className={isActive ? "text-foreground" : "text-muted-foreground"}>
      <div className="text-sm font-semibold">{item.title}</div>
      <div className="mt-1 text-xs">{item.desc}</div>
    </div>
  )
}

function Media({ stepIndex }: { stepIndex: number }) {
  const item = items[stepIndex]
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
    <HighlightStepScrollytelling
      steps={items.length}
      stepScrollDistance={360}
      StepComponent={Step}
      MediaComponent={Media}
    />
  )
}
```

### Scroll progress behavior
- StepComponent `scrollProgress` tracks the *section-level* progress (0–1).
- MediaComponent `scrollProgress` tracks the *media group* progress (0–1).

### Props
- `steps?: number`: step count, default `4`, max `6`.
- `mediaSide?: "left" | "right"`: media position on large screens.
- `className?: string`: section wrapper class.
- `stepClassName?: string`: step button wrapper class.
- `mediaClassName?: string`: media wrapper class.
- `stepRatio?: number`: step column width ratio (0–1), default `0.4`.
- `mediaMinHeight?: string`: media min height, default `"70vh"`.
- `stepScrollDistance?: number`: extra scroll distance per step, default `400`. Overall height ~ `100vh + steps * stepScrollDistance`.
- `getMediaKey?: (stepIndex) => string | number`: group adjacent steps by key.
- `StepComponent`: required, renders step content.
- `MediaComponent`: required, renders media content.

---

## Shared Concepts

### StepComponent / MediaComponent
All components require two render components:
- `StepComponent`: renders each step’s text or card content.
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
- `scrollProgress`: 0–1 MotionValue for transforms or progress bars.

### getMediaKey (media grouping)
`getMediaKey` groups adjacent steps into a single “media group”. The MediaComponent stays mounted within a group, and its `scrollProgress` runs from 0 to 1 across all steps in that group.

Note: only *adjacent* steps with the same key are merged.

```ts
getMediaKey={(index) => (index < 2 ? "intro" : "details")}
```
