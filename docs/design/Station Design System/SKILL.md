---
name: presstronic-design
description: Use this skill to generate well-branded interfaces and assets for Presstronic and its Station product, either for production or throwaway prototypes/mocks/decks. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the `readme.md` file within this skill first — it covers the brand context, content
voice, visual foundations, and iconography — then explore the other files:

- `styles.css` + `tokens/` — the design tokens (coral & aqua scales, ink ramp, type,
  spacing, radii, shadows, glows, motion, and a `[data-theme="dark"]` scope). Link
  `styles.css` to inherit everything.
- `components/core/` — `Button` and `Badge` React primitives with `.d.ts` contracts and
  `.prompt.md` usage notes.
- `ui_kits/station/` — the full Station marketing website, factored into small JSX
  sections; a reference for layout, the product console mock, and the light/dark pattern.
- `guidelines/` — foundation specimen cards.
- `assets/img/` — legacy reference imagery.

If creating visual artifacts (slides, mocks, throwaway prototypes), copy the assets and
tokens you need out and produce static HTML files for the user to view. If working on
production code, copy the assets and read the rules here to become an expert in designing
with this brand.

Key rules to honor: one signature accent at a time (aqua for Station, coral for
Presstronic warmth); dark-dominant with a clean light mode; Space Grotesk / Hanken
Grotesk / JetBrains Mono; Lucide icons only (no emoji, no hand-drawn SVG); mono uppercase
eyebrows; soft elevation + brand glows; 12–16px corners; quick eased motion with a subtle
press-scale.

If the user invokes this skill without other guidance, ask them what they want to build,
ask a few focused questions, and act as an expert designer who outputs HTML artifacts
**or** production code, depending on the need.
