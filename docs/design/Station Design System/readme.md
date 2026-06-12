# Presstronic Design System

The shared design language for **Presstronic** — a software development studio that
crafts its own line of software products and takes on development work for the right
partners. This system also houses the sub-brand for **Station**, Presstronic's
guild & org management platform, and is built to generate well-branded interfaces,
marketing sites, decks, and prototypes that feel unmistakably Presstronic.

> The visual DNA is anchored on the **cornflower blue `#53AEF7`** of the RSI / Star
> Citizen _Galactapedia_ — a bright instrument accent that glows over a deep **Firefly
> navy `#0B1D29`** canvas, with cool **Hit Gray `#A9B3BD`** text. The legacy Presstronic
> **coral `#F05A45`** is retained as a warm reserve accent; everything else (type,
> spacing, motion, components) is a modern rebuild.

---

## Products represented

| Product             | What it is                                                                                                                                                     | Status                                              |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| **Station**         | Full-stack command center for gaming guilds & orgs — fleets, inventory, mining, contracts, treasury, HR, all wired into Discord. _Has its own aqua sub-brand._ | In development — **flagship UI kit in this system** |
| Presstronic Academy | Branching, story-driven learning platform for developers                                                                                                       | In development                                      |
| Kalsumed            | Daily food-intake / kilocalorie tracker with AI photo recognition                                                                                              | In development                                      |
| Vulntronic Labs     | Docker lab of intentionally-vulnerable apps for safe security practice                                                                                         | In development                                      |

The studio itself is **Presstronic LLC** (formerly styled "Presstronic Studios").

---

## Sources

This system was built by studying the studio's own code. The reader may not have
access, but these are recorded so a future build can go deeper:

- **GitHub — `Presstronic/wp-presstronic-legacy-theme`**
  <https://github.com/Presstronic/wp-presstronic-legacy-theme>
  The legacy WordPress theme. The brand palette, the coral accent, the uppercase-bold
  display treatment, and the studio's voice were all lifted from here
  (`assets/css/main.css`, `front-page.php`). Explore this repo to recover original
  product copy and the classic hero treatment.

Per the brief, we deliberately did **not** recreate the legacy theme's structure —
only its color palette and tone.

---

## Content fundamentals — how Presstronic writes

The legacy voice is **warm, direct, and enthusiastic** — first-person studio ("we"),
talking straight to "you/your," with the occasional exclamation:
_"We make your internet home, worry free!"_, _"Let's DO this!"_, _"It's that simple!"_

For **Station** the register is tuned up to **clean, confident SaaS** — still in the
family, just more product-grade:

- **Voice:** second person, benefit-led, active. _"Run your org like a flagship, not a
  spreadsheet."_ _"Your org deserves a command center."_
- **Casing:** Sentence case for headlines and body. **UPPERCASE + wide tracking** only
  for mono eyebrows, labels, badges, and nav micro-copy.
- **Eyebrows:** short, mono, uppercase, prefixed with a short rule (`— CAPABILITIES`).
- **Personality:** light domain flavor (fleets, hangars, armadas, crews) used sparingly
  for color — never at the expense of clarity. _"Scale from a squad to an armada."_
- **Punctuation:** periods on headlines are fine ("Frequently asked."). Em-dashes for
  asides. Exclamation marks are reserved — the Presstronic studio voice may use them;
  Station mostly doesn't.
- **No emoji.** Status and category meaning is carried by mono badges and Lucide icons,
  never emoji.
- **Numbers** read in mono (`8.42M`, `312`, `27`) — it signals "real data."

---

## Visual foundations

**Overall vibe.** Dark-dominant, precise, a little bit "mission control." Calm charcoal
canvas, one confident aqua accent that glows, coral kept in reserve as a warm pop.
Generous whitespace, crisp hairline borders, mono labels. Professional, not gamer-loud.

- **Color.** One signature accent at a time: **cornflower blue `#53AEF7`** (RSI
  Galactapedia instrument blue) is the system primary; **coral `#F05A45`** is the warm
  Presstronic reserve. A cool navy / blue-gray **ink** ramp (Firefly `#0B1D29` →
  Hit Gray `#A9B3BD`) carries text and surfaces. Tints are produced with `color-mix()`
  against the accent so they track light/dark automatically. Avoid introducing new hues.
- **Backgrounds.** Flat charcoal surfaces. The only "decoration" is a **soft radial
  glow** (aqua, with a faint coral secondary) behind the hero, and a **faint square
  grid** masked with a radial fade. No photographic backgrounds, no busy gradients, no
  noise. (The one legacy photo — `assets/img/legacy-hero.jpg` — is kept for reference
  only.)
- **Type.** Display = **Space Grotesk** (tight `-0.03em` tracking, weight 700 for hero,
  500 for sub-display). Body = **Hanken Grotesk** (400–600, line-height ~1.6). Mono =
  **JetBrains Mono** for eyebrows, labels, data, and code paths.
- **Spacing & layout.** 4px base scale; ~112px section rhythm; content maxes at
  **1180px** (evolved from the legacy 1100px wrap). Bento grids for features, 3-up for
  pricing. Everything laid out with flex/grid + `gap`.
- **Corners.** Buttons & cards **12–16px**; large surfaces 24–32px; **pills (999px)** for
  badges, tags, and the hero notification chip only. No fully-square edges.
- **Borders.** Hairline. On dark: low-opacity white (`rgba(255,255,255,.07–.20)`). On
  light: the ink-100/200 ramp. Borders strengthen on hover.
- **Shadows & glows.** Soft, low-contrast elevation shadows on light; deep diffuse
  shadows on dark. Brand CTAs carry a **colored glow** (`--glow-aqua` / `--glow-coral`)
  rather than a hard drop shadow.
- **Cards.** Surface fill + hairline border + (on hover) a 2–3px lift, a stronger
  border, a soft elevation shadow, and a faint radial accent glow bleeding from a
  corner. Radius 16px.
- **Motion.** Quick and eased, never bouncy in product chrome. `--ease-out`
  (`cubic-bezier(.22,1,.36,1)`) at 120–360ms. Hovers lift; **presses scale to ~0.99**.
  The FAQ "+" rotates 45° to an "×". Respect `prefers-reduced-motion`.
- **Hover / press states.** Links fade muted→strong. Ghost buttons gain the accent
  border + text. Primary buttons darken (`--brand-hover`) and lift. Nothing relies on
  color alone.
- **Transparency & blur.** The nav is transparent at the top and, once scrolled, becomes
  a `color-mix` of the page color at 82% + `backdrop-filter: blur(14px)` — a direct
  evolution of the legacy "transparent → solid on scroll" nav.
- **Imagery (when used).** Cool, dark, high-contrast, slightly desaturated to sit under
  the aqua accent. Prefer real product UI (see the console mock) over stock photography.

---

## Iconography

- **Library: [Lucide](https://lucide.dev)** (loaded from CDN, pinned to `0.460.0`).
  Lucide is the maintained successor to Feather — and the legacy theme hand-drew its
  service icons in exactly that Feather style (`stroke-width:1.8`, round caps), so Lucide
  is a faithful, native-feeling match rather than a substitution.
- **Style:** outline, `currentColor`, ~2px stroke, rounded joins. Icons inherit text
  color and so adapt to light/dark and brand automatically.
- **Usage in code:** `<i data-lucide="rocket"></i>` then `lucide.createIcons()`. In React
  surfaces, icons are rendered statically (no node-swapping mid-render) and CSS targets
  the resulting `svg`. Common Station glyphs: `orbit` (logo), `rocket` (fleet),
  `pickaxe` (mining), `package` (inventory), `scroll-text` (contracts), `landmark`
  (treasury), `badge-check` (certs), `medal` (rewards), `bot` (Station Bot).
- **Mono labels** act as quasi-iconography — an uppercase mono eyebrow with a leading
  rule is the system's recurring "wayfinding" mark.
- **No emoji, anywhere.** No icon fonts beyond Lucide. SVGs are never hand-authored for
  this system — pull from Lucide or substitute the nearest Lucide glyph.

> ⚠️ **Font substitution flag:** the legacy theme used the system-ui stack and shipped no
> custom fonts. Space Grotesk / Hanken Grotesk / JetBrains Mono are a deliberate brand
> choice loaded from Google Fonts. If you have licensed/self-hosted binaries, drop them
> in and replace the `@import` in `tokens/fonts.css` with `@font-face` rules.

---

## Index / manifest

**Root**

- `styles.css` — the single entry point consumers link. `@import`s the four token files.
- `readme.md` — this guide.
- `SKILL.md` — Agent-Skills-compatible front-matter so this folder can be used directly.

**Tokens** (`tokens/`)

- `colors.css` — coral & aqua scales, ink ramp, semantic status, light + **dark** aliases.
- `typography.css` — families, weights, type scale, tracking, semantic type roles.
- `spacing.css` — spacing, layout, radii, borders, shadows, **brand glows**, motion, z-index.
- `fonts.css` — webfont loading (Google Fonts; see substitution flag).

**Components** (`components/core/`)

- `Button` — token-driven action button (`primary` aqua / `warm` coral / `ghost` / `subtle`).
- `Badge` — mono-cased status & category pill (6 tones, soft/solid).
- `core.card.html` — the Design-System-tab specimen for both.

**UI kit** (`ui_kits/station/`)

- `index.html` — the full **Station marketing website** (Nav, Hero + product console mock,
  Features bento, Pricing, FAQ, Final CTA, Footer). Dark by default with a **light/dark
  Tweak**. Composed from `Nav.jsx`, `Hero.jsx`, `Features.jsx`, `Pricing.jsx`, `FAQ.jsx`,
  `CTA.jsx`, assembled in `StationApp.jsx`. Styles in `station.css` + `station-sections.css`.

**Foundation cards** (`guidelines/`) — the specimen cards shown in the Design System tab:
colors (coral, aqua, ink, semantic, dark surfaces), type (display, body, mono, scale),
spacing (scale, radii, shadows), and brand (logo lockup, palette at a glance).

**Assets** (`assets/img/`)

- `legacy-hero.jpg`, `legacy-screenshot.png` — reference captures of the 2015 site.
