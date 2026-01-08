# Flowchart Skill

This skill builds interactive flowcharts with SVG. It focuses on consistent visual styling, interactive nodes, and a Dagre-driven layout that sizes nodes based on their content without accidental viewBox scaling.

## Style
- Match the page theme: reuse the same font family, background, and color tokens as the rest of the page (define CSS variables if needed).
- Nodes should feel like part of the UI system: rounded rectangles, soft borders, and a hover shadow filter.
- Keep link styling subtle but readable; emphasize direction with arrow markers only when needed for ordering.

## Interaction
- Nodes must support a clear hover state (shadow, glow, or elevation) that matches the page’s visual language.
- Click interaction is optional: if used, it should reveal step details or trigger related UI without breaking the flow.
- Keep keyboard access in mind when interactions are enabled: focusable nodes and visible focus styling.

## Layout
- Load Dagre only from `https://dagrejs.github.io/project/dagre/latest/dagre.min.js`.
- Use Dagre to compute the node positions; set node widths/heights based on measured label size plus padding.
- Render edges as cubic bezier paths. Add `marker-end` (or `marker-start`) only for edges that represent sequence.
- Avoid scaling from viewBox: set the SVG width/height to match the layout dimensions and only use a viewBox that matches those exact values.
