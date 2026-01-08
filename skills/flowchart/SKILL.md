# Flowchart Skill

This skill builds interactive flowcharts with SVG. It focuses on consistent visual styling, interactive nodes, and a Dagre-driven layout that sizes nodes based on their content without accidental viewBox scaling.

## Style
- Match the page theme: reuse the same font family, background, and color tokens as the rest of the page (define CSS variables if needed).
- Nodes should feel like part of the UI system: rounded rectangles, soft borders, and a hover shadow filter.
- Keep link styling subtle but readable; emphasize direction with arrow markers only when needed for ordering.

**Arrow marker example:**
```svg
<marker id="point-end" class="marker" viewBox="0 0 10 10" refX="5" refY="5" markerUnits="userSpaceOnUse" markerWidth="8" markerHeight="8" orient="auto">
  <path d="M 0 0 L 10 5 L 0 10 z" class="arrow-marker-path" style="stroke-width: 1; stroke-dasharray: 1, 0;"></path>
</marker>
<marker id="point-start" class="marker" viewBox="0 0 10 10" refX="4.5" refY="5" markerUnits="userSpaceOnUse" markerWidth="8" markerHeight="8" orient="auto">
  <path d="M 0 5 L 10 10 L 10 0 z" class="arrow-marker-path" style="stroke-width: 1; stroke-dasharray: 1, 0;"></path>
</marker>
```

## Interaction
- Nodes must support a clear hover state (shadow, glow, or elevation) that matches the page’s visual language.
- Click interaction is optional: if used, it should reveal step details or trigger related UI without breaking the flow.
- Keep keyboard access in mind when interactions are enabled: focusable nodes and visible focus styling.

## Layout
- Load Dagre only from `https://dagrejs.github.io/project/dagre/latest/dagre.min.js`.
- Use Dagre to compute the node positions; set node widths/heights based on measured label size plus padding.
- Render edges as cubic bezier paths. Add `marker-end` (or `marker-start`) only for edges that represent sequence.
- Avoid scaling from viewBox: set the SVG width/height to match the layout dimensions and only use a viewBox that matches those exact values.
- Swimlanes: treat lanes as fixed bands (rows or columns). After Dagre positions nodes, snap each node into its assigned lane and expand the lane bounds to include all member nodes plus padding. Render lane backgrounds behind nodes with a clear label header.
- Node groups/sections: compute group bounds from member nodes, then draw a rounded background rectangle with a label anchored to the top-left of the group. Keep group padding consistent, render groups behind nodes, and update group bounds if node sizes change.

