# MESH — Design System & Frontend Specification

> **Version 1.0 — the redesign bible.**
> Every frontend decision is checked against this document. If a screen looks like
> Grafana, Datadog, or a crypto exchange, it has violated this document.

---

## 0. The One-Sentence Brief

Mesh is not software you *use* — it is a protocol you *enter*. The UI must read as
**computational luxury**: renaissance intelligence meeting machine intelligence,
black-and-white editorial restraint with a living network underneath.

Target reaction: *"I have never seen a protocol UI that feels like this."*

---

## 1. Design Philosophy

### 1.1 Two Worlds

| | World 1 — Human Layer | World 2 — Agent Layer |
|---|---|---|
| Who | Owners, operators, arbiters | Autonomous agents |
| Feels | Clear, elegant, trustworthy | Alive, reactive, computational |
| Visual language | Editorial serif, generous whitespace, paper texture | Mono type, particle motion, network topology |
| Motion | Calm springs, slow reveals | Continuous ambient motion, data pulses |
| Metaphor | A reading room | A nervous system |

**The torn-paper transition is the seam between the two worlds.** Every time the user
crosses from human context to agent context (landing → protocol, card → reasoning
trace, modal open), the human "paper" tears to reveal the machine layer beneath.
This is the signature move of the entire product. Use it deliberately, not everywhere.

### 1.2 Anti-goals (hard bans)

- No dashboard grids of 8+ equal-weight panels
- No neon green / cyberpunk glow
- No gradient spam, no glassmorphism cards stacked edge to edge
- No telemetry aesthetics (sparklines everywhere, uptime widgets)
- No skipping the landing page — the landing IS the product's first argument

---

## 2. Color System

Strict monochrome base. Color = state, never decoration.

```css
:root {
  /* Base — the paper and the void */
  --mesh-white:   #FAFAF7;   /* warm paper white, NOT #FFF */
  --mesh-black:   #0A0A0B;   /* soft black, NOT #000 */
  --mesh-ink:     #16161A;   /* card surfaces on dark */
  --mesh-paper:   #F2F1EC;   /* secondary paper tone */

  /* Grays — 4 steps only */
  --mesh-gray-1:  #E5E4DF;   /* hairlines on light */
  --mesh-gray-2:  #A8A7A1;   /* secondary text on light */
  --mesh-gray-3:  #55555C;   /* secondary text on dark */
  --mesh-gray-4:  #2A2A30;   /* hairlines on dark */

  /* State accents — the ONLY colors allowed */
  --mesh-blue:    #2E5CFF;   /* active / verification / settlement */
  --mesh-blue-dim:#1D3AA8;   /* blue pressed/secondary */
  --mesh-red:     #E23D2E;   /* dispute / error */
  --mesh-red-dim: #8F2118;   /* red pressed/secondary */
}
```

Rules:
- Blue and red appear on **< 5% of any screen's pixels**. If a screen is colorful, it's wrong.
- Landing page = light world (paper white). Protocol surfaces = dark world (soft black).
  Crossing between them is always a torn-paper or blur-depth transition, never a hard cut.
- Status dots: blue pulse = active, red pulse = dispute, static gray = idle/paused.

---

## 3. Typography

Two families, maximal contrast between them.

### Display — editorial serif
**Primary choice: "PP Editorial New"** (paid — see Asset Requirements).
**Free fallback (build with this until licensed): "Instrument Serif"** (Google Fonts) —
it has the right high-contrast, slightly haughty editorial voice.

Usage: hero headlines, section titles, human-layer headings, large numerals
(escrow amounts, trust scores). Always tight tracking (`-0.03em`), huge sizes
(clamp 3rem → 9rem on hero). Italic variant for emphasis words: *Coordinate* Intelligence.

### Mono — protocol voice
**Primary choice: "Geist Mono"** (free, Vercel). Fallback: IBM Plex Mono.

Usage: agent IDs, addresses, statuses, labels, timestamps, negotiation transcripts,
reasoning traces, ALL protocol data. Uppercase with wide tracking (`0.12em`) for labels:
`ESCROW · LOCKED`, `AGENT · NEGOTIATING`.

### Scale

```
Hero display:   clamp(56px, 10vw, 144px) / serif / -0.03em
Section title:  clamp(32px, 5vw,  64px)  / serif
Card title:     20px  / serif
Body:           16px  / system sans (Geist Sans) — body copy only
Protocol label: 11px  / mono / uppercase / +0.12em
Data value:     13px  / mono
Big numeral:    48–96px / serif (amounts, scores)
```

---

## 4. Art Direction

### 4.1 Torn paper (signature transition)
- Implementation: SVG clip-path with a pre-drawn irregular tear edge (3 variants,
  alternate randomly), animated with Framer Motion `clipPath` interpolation +
  a 2px displaced duplicate edge for fiber texture.
- Sound-level restraint: 500–700ms, custom ease `[0.76, 0, 0.24, 1]`.
- Used at: landing → protocol scroll seam, arbitration modal open, section reveals
  on landing. Max ~4 uses in the whole product.

### 4.2 Halftone / stipple portraits
- Classical sculpture busts rendered as black-and-white halftone dot fields.
- On hover/scroll, dots re-sort into network topology (the bust *becomes* the graph)
  — this is the "human intelligence becoming computational" symbol, and the
  centerpiece of the landing's explanation section.
- Implementation: image sampled to a dot grid on `<canvas>`; each dot is a particle
  that can lerp between "portrait position" and "graph node position".

### 4.3 Classical sculpture + futurism
- Sources: public-domain museum scans (see Asset Requirements).
- Treatment: always monochrome, high contrast, halftoned or line-traced.
  Never displayed as a plain photo.

---

## 5. Motion System

All motion via Framer Motion springs + R3F for the hero. One global config:

```ts
export const springs = {
  // Human layer — calm and certain
  editorial: { type: "spring", stiffness: 120, damping: 24, mass: 1 },
  // Agent layer — alive, slightly nervous
  reactive:  { type: "spring", stiffness: 300, damping: 22, mass: 0.6 },
  // Torn paper / world transitions
  tear:      { duration: 0.6, ease: [0.76, 0, 0.24, 1] },
};
```

Principles:
- **Depth over slide.** Elements arrive by scale (0.96→1) + blur (8px→0) + opacity,
  not by sliding in from off-screen.
- **Choreography.** Staggered children (60ms), never simultaneous pops.
- **Ambient life in agent layer only.** Network hero, status pulses, negotiation
  streams animate continuously at low amplitude. Human layer is still until touched.
- **Scroll choreography on landing:** hero morph, section pins, torn seam —
  driven by `useScroll` + spring-smoothed progress. No scroll-jacking (native
  scroll speed always preserved).

---

## 6. The Reactive 3D Hero

Stack: **React Three Fiber + custom shaders**, `<Canvas>` lazy-loaded,
static SVG topology poster as SSR/reduced-motion fallback.

Concept — **"The Mesh"**: a slowly breathing point-cloud network of ~1,200 nodes
arranged on a distorted sphere/plane hybrid:
- Nodes: white points (dark section) with 6–8 blue "active agents" pulsing.
- Edges: faint lines that appear/disappear as negotiation paths route through.
- **Mouse reactivity:** cursor is a gravity well — nodes lean toward it, edges
  re-route around it (shader uniform, spring-smoothed).
- **Scroll morph:** as the user scrolls, the cloud tightens from chaos into an
  ordered lattice — *entropy → coordination*, the protocol's thesis stated visually.
- Performance budget: 60fps desktop / 30fps mobile, `dpr={[1, 1.5]}`,
  points + line segments only, zero postprocessing passes beyond one custom shader.

---

## 7. UX Architecture — The Four Surfaces

### SURFACE 1 — Landing (`/`)  ← the most important screen

Light world. Paper white. Editorial.

1. **Hero** — full viewport. Headline: **"Coordinate Intelligence"** (serif, huge,
   *Intelligence* in italic). Sub (mono, small): `THE PROTOCOL FOR HUMAN + AGENT COMMERCE`.
   The 3D mesh sits behind/below the type, reactive to cursor. One CTA:
   `ENTER THE PROTOCOL →` (mono label, hairline border button).
2. **Thesis strip** — the diagram, animated line by line on scroll:
   `Human ↔ Platform ↔ Human` (struck through) → `Human ↔ Mesh ↔ Agent` → `Agent ↔ Mesh ↔ Agent`.
3. **Protocol explanation** — 5 steps (Intent → Route → Negotiate → Verify → Settle),
   pinned section; each step advances the halftone-bust-to-network particle morph.
   One serif line + one mono caption per step. No paragraphs.
4. **Live protocol proof** — 3 editorial stat cards (agents registered, tasks settled,
   GEN in escrow) pulled from chain. Real numbers, small, confident.
5. **Torn seam** — the paper tears at the bottom of the page revealing the dark world;
   scrolling through it lands on the Command Center (`/console`).

### SURFACE 2 — Command Center (`/console`)

Dark world. The reading room for operators. **Five objects max**, strong hierarchy:

- Top: serif greeting + treasury balance as the single big numeral.
- One row of four editorial cards: **Active Agents / Active Contracts / Escrow / Disputes**
  — serif number, mono label, one-line delta. A red-pulse dot on Disputes when > 0.
- Below: **the activity feed as prose**, not a table — mono lines like
  `14:02 · atlas-7 accepted "market-scan-eu" · 40 GEN` streaming in with reactive springs.
- Nothing else. No charts on this screen.

### SURFACE 3 — Agent Workbench (`/agents/[id]`)

Dark world, technical but readable. Layout: editorial header + two columns.

- Header: agent name (serif, large), `ID · STATUS · AUTONOMY` mono strip,
  owner address, pause/limit controls (human-layer clarity).
- Left column — **the numbers**: trust score as a large serif numeral with a thin
  radial arc, confidence, current load, spending limit vs. spent.
- Right column — **the mind**: tabbed mono panels for *Reasoning Trace* /
  *Negotiation History* / *Verification Evidence*. Traces render as typed-out
  mono lines with timestamps; negotiations as an offer/counter ladder with the
  agreed price in blue.
- The seam between columns is a subtle torn edge (static, not animated) —
  human column / machine column.

### SURFACE 4 — Arbitration Modal

High-stakes. Full-screen takeover, opened with the torn-paper tear (the human
reaches *into* the machine world to make a judgment).

- Backdrop: console blurred to 24px, dimmed 70%.
- Center column (max 720px): `DISPUTE · ESCROW #…` mono label, the disputed amount
  as the single biggest element on screen (serif, 96px), claimant vs. respondent
  evidence in two mono panels, verification report excerpt.
- Exactly two actions, full-width, side by side:
  `RELEASE TO PROVIDER` (blue) / `REFUND TO REQUESTER` (red).
  Both require a 600ms press-and-hold with a filling border — no accidental judgments.
- No close X. Escape or an explicit `DEFER DECISION` text link. Deciding should feel heavier than dismissing.

---

## 8. Component Inventory (build order)

1. `TokenProvider` — CSS vars, fonts, springs config
2. `TornEdge` / `TornReveal` — SVG clip-path transition primitives
3. `MeshHero` — R3F point-cloud + fallback poster
4. `HalftoneMorph` — canvas bust→network particle component
5. `EditorialCard`, `StatNumeral`, `ProtocolLabel`, `HoldButton`
6. `ActivityFeed` (prose stream), `TraceViewer`, `NegotiationLadder`
7. Surfaces: `Landing`, `Console`, `Workbench`, `ArbitrationModal`

Stack: Next.js (App Router) · Tailwind v4 (tokens via `@theme`) · TypeScript ·
Framer Motion · React Three Fiber/Three.js. All existing views (`OVR/CON/WRK`)
are replaced, not restyled.

---

## 9. Asset Requirements (MUST be resolved before build — do not fake)

| # | Asset | Purpose | Options |
|---|---|---|---|
| 1 | Display serif font license | Hero/headlines | **A:** buy PP Editorial New · **B:** free Instrument Serif |
| 2 | 2–3 classical bust images, high-res, public domain | Halftone morphs | Smithsonian Open Access / Met Museum API (CC0) — I can fetch these |
| 3 | Noise/paper grain texture (subtle) | Paper world surfaces | Generate procedurally (free) or premium texture pack |
| 4 | 3 torn-edge SVG paths | Signature transition | I draw these by hand in SVG (free) |
| 5 | OG/social image | Link previews | Derived from hero once built |

Nothing else is required. No stock video, no icon packs (hairline custom glyphs only).

---

## 10. Implementation Notes for Claude Code

- Build the token layer + `TornReveal` + `MeshHero` first; every other component
  consumes them.
- Landing is a fully static route (SSG) — the 3D canvas hydrates client-side only.
- Respect `prefers-reduced-motion`: hero becomes the poster, tears become crossfades.
- Type all chain data (`Agent`, `Intent`, `Negotiation`, `Escrow`, `Reputation`)
  in `frontend/lib/types.ts` FIRST — the coming full on-chain refactor (genlayer-js
  direct calls, no backend) will swap the data source without touching components.
- Lighthouse floor: 90 performance on landing with the canvas lazy-loaded.
