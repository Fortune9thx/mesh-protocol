# MESH — Motion Choreography Specification

> Companion to DESIGN.md. Motion is a first-class requirement.
> Every landing section defines: **entry / scroll / hover / exit-transition / performance strategy**.

---

## 0. Stack & Division of Labor

| System | Owns | Never touches |
|---|---|---|
| **GSAP** (ScrollTrigger, SplitText) | Scroll axis: pins, scrubs, section timelines, type staggers, torn-reveal progress | Pointer hover states |
| **Framer Motion** | Pointer & UI state: hover, press, modals, layout, route transitions | Scroll-linked animation |
| **R3F / Three.js + custom GLSL** | Everything on canvas: particles, bust, network, collapse | DOM elements |

**Bridge:** GSAP ScrollTrigger writes scroll progress into R3F shader uniforms
(`uScroll`, `uSection`) via a zustand store. One scroll source of truth.

**Global timing language**
```
Ease (cinematic):  power3.inOut  /  cubic-bezier(0.76, 0, 0.24, 1)
Ease (arrival):    power4.out
Type stagger:      0.04s per word, 0.012s per char
Tear duration:     0.6–0.8s
Ambient loop amp:  low — nothing ambient moves more than 4px or 0.03 rad
```

**Global performance rules**
- One `<Canvas>` for the entire page (all 3D scenes are stages in one scene graph, switched by `uSection`) — never multiple WebGL contexts.
- `dpr={[1, 1.5]}`, no postprocessing chain; all effects in-material (GLSL).
- DOM animation: transform + opacity + clip-path only. No layout-affecting properties.
- `prefers-reduced-motion`: all scrubs become fades, canvas renders a static frame, tears become 300ms crossfades.
- Budget: 60fps desktop, 30fps floor mobile; total JS for motion libs ≈ 60KB gz (GSAP core+ST ~23KB, FM ~32KB tree-shaken).

---

## 1. HERO INTRO — *"something is booting up"*

**Sequence (time-based, plays once on load):**
```
0.0s   Pure black. Nothing. (deliberate 400ms of silence)
0.4s   ~2,000 particles ignite from center — GLSL materialization:
       points lerp from random sphere → MESH logo glyph positions (sampled
       from logo SVG), additive white, size-attenuated
1.6s   Logo holds 300ms, then particles loosen into background topology
2.0s   Headline "Coordinate Intelligence" — SplitText chars, opacity 0→1,
       blur 12px→0, y 24px→0, 0.012s/char stagger, power4.out
2.6s   Mono subline types on: THE PROTOCOL FOR HUMAN + AGENT COMMERCE
2.9s   CTA hairline border draws itself (SVG stroke-dashoffset, 0.5s)
```
- **Scroll:** hero pinned for 100vh of scroll; particles drift apart and
  topology grid fades in (uScroll 0→1); headline lifts −10vh with 0.15 parallax lag.
- **Hover:** cursor = gravity well in particle field (spring-smoothed uniform,
  stiffness ~120). CTA hover: border brightens, label tracking +0.02em (FM).
- **Transition out:** first torn-paper seam — dark canvas "tears open" to the
  paper-white thesis section (GSAP-scrubbed clip-path on the white layer above).
- **Strategy:** R3F + GLSL (particles), GSAP SplitText (type), FM (CTA hover).
  Boot sequence skipped entirely on `prefers-reduced-motion` and repeat visits
  (sessionStorage) — logo poster shown instead.

## 2. REACTIVE 3D ARTIFACT (bust) — *"human consciousness inside machine infrastructure"*

The halftone bust is a **point cloud** (CC0 museum scan sampled to ~40k points).

- **Entry:** dots swirl in from curl-noise field → bust positions over 1.2s
  (scrub-linked, so scrolling backward un-forms it).
- **Scroll:** bust slowly rotates (0.15 rad total across section); at section
  midpoint, dots progressively re-sort into network topology (bust *becomes*
  the graph) — mix driven by uScroll.
- **Hover/pointer:** mouse parallax ±6°, depth displacement (points near cursor
  push 2–4px along normals), constant subtle particle drift (curl noise,
  amplitude 0.3px).
- **Transition out:** torn seam #2.
- **Strategy:** pure GLSL point material (positionA/positionB attributes,
  uMix uniform). CPU does nothing per-frame. Fallback: static halftone PNG.

## 3. TORN-PAPER TRANSITIONS

- **Mechanic:** the incoming section sits above with an SVG `clip-path`
  (irregular tear edge, 3 hand-drawn variants rotated between uses);
  ScrollTrigger scrubs the tear across the viewport (0.8 scroll-screens).
  A 2–3px duplicated offset edge + grain gives paper fiber.
- **Sound-level restraint:** exactly 3 tears on the landing
  (hero→thesis, bust→protocol, human→settlement). Progressive disclosure:
  content beneath the tear parallax-lags 8% so the rip reveals depth, not a flat swap.
- **Hover:** none (transition primitive).
- **Strategy:** GSAP-scrubbed clip-path (GPU-composited). No canvas involvement.

## 4. PROTOCOL VISUALIZATION — *"living economic network"*

Scroll-pinned for 4 screens. The five steps are acts in one continuous simulation:

```
Act 1 INTENT      a single blue node spawns center; intent card fades beside it
Act 2 ROUTE       ~30 agent nodes spawn outward (staggered scale-in);
                  faint edges shoot from intent node — pathfinding pulses
Act 3 NEGOTIATE   3 candidate edges thicken; offer/counter pulses travel
                  back & forth along them (dash-offset animation in shader);
                  losing edges dim, winner turns blue
Act 4 VERIFY      deliverable pulse travels back to center; verification ring
                  draws around it (SVG stroke, 0.6s)
Act 5 SETTLE      a bright settlement pulse travels the edge; both endpoint
                  nodes flash; a mono ledger line stamps in:
                  SETTLED · 40 GEN · atlas-7
```
- **Scroll:** fully scrub-linked — user can play the economy forward/backward.
- **Hover:** nodes swell 1.3× near cursor; mono tooltip (`agent-id · capability`) via FM.
- **Transition out:** camera pulls back — the one task fades into hundreds of
  ambient background transactions (the point: this happens constantly). Cut on dark, no tear.
- **Strategy:** R3F instanced points + line segments, pulses via GLSL
  dash-offset; step captions are DOM (GSAP-timed to acts).

## 5. HUMAN INTERVENTION MOMENT — *"humans still matter"* (the thesis peak)

The strongest beat. Contrast through **stillness**:

```
Beat 1  Network runs at full ambient speed (continuation of §4 background)
Beat 2  One edge flashes RED — dispute. A dissonant moment in the flow.
Beat 3  TIME DILATION: global uTimeScale eases 1.0 → 0.05 over 1.2s.
        Every particle, pulse, drift slows to near-freeze.
        (The entire "machine world" holds its breath.)
Beat 4  Paper-white human control panel slides up over the frozen network
        (FM spring, editorial calm): the dispute as a clean serif card —
        amount, parties, evidence excerpt, two hold-to-decide buttons.
Beat 5  On scroll-through (demo auto-resolves): panel recedes, uTimeScale
        springs back to 1.0, network resumes, resolved edge turns blue.
Caption (serif, only line on screen): "Autonomous — until judgment matters."
```
- **Scroll:** beats 2–5 scrub-linked across 2.5 screens; the freeze is
  scroll-triggered, the panel entrance is time-based once triggered.
- **Hover:** hold-to-decide buttons show the filling-border affordance (FM), non-functional in demo.
- **Strategy:** uTimeScale uniform (one number freezes the whole GPU world —
  cheap and total); panel is DOM via FM spring.

## 6. CTA ENDING — *"clean and memorable"* (hero played in reverse)

```
1  Background topology begins contracting — all ambient nodes drift centerward
2  Edges shorten and merge; brightness concentrates
3  Nodes collapse into the MESH logo glyph (exact reverse of hero boot —
   same attribute buffers, uMix reversed)
4  Logo settles; a final hairline ring draws around it
5  Serif line: "The network is forming." + CTA: ENTER THE PROTOCOL →
6  Footer fades in below: mono links, contract addresses, GitHub
```
- **Scroll:** collapse scrubbed over 1.5 screens; ring + CTA time-based on completion.
- **Hover:** CTA inverts (white fill, black label) via FM; logo particles shimmer within 80px of cursor.
- **Transition:** CTA click → full-screen tear into the dark Command Center. The last tear. The user *enters through the paper*.
- **Strategy:** same particle system as hero (buffers reused — zero new allocation), GSAP scrub, FM on CTA.

---

## 7. Section-to-Uniform Map (implementation crib)

| Scroll region | ScrollTrigger | Canvas stage (uSection) | Key uniforms |
|---|---|---|---|
| Hero | pin 100vh | 0 boot/topology | uBoot, uScroll, uPointer |
| Thesis strip | none (DOM only) | canvas dimmed | — |
| Bust | pin 200vh | 1 bust↔graph | uMix, uPointer, uRotate |
| Protocol viz | pin 400vh | 2 network acts | uAct (0–5), uPointer |
| Intervention | pin 250vh | 2 (continued) | uTimeScale, uDispute |
| CTA | pin 150vh | 3 collapse | uCollapse |

One canvas. One scroll timeline. Six stages.
