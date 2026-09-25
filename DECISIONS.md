# DECISIONS

## 2026-09-15 — v1.9.0 Inspector redesign (1 box per axis, pin-start, easing, sticky-header offset)

**Attribute migration: dual-read, not one-time rewrite.** Old per-effect booleans
(`szmGsapSlider`, `szmGsapProcess`, `szmGsapAccordion`, `szmGsapHorizontal`,
`szmGsapFullpage`) stay registered forever; the new unified `szmGsapEffect`
dropdown takes precedence when set, otherwise `addSaveProps`/the Inspector
fall back to reading the legacy booleans (win-priority unchanged: slider >
process, accordion > horizontal > fullpage). Touching the new dropdown at all
(including picking "Geen") clears the legacy booleans so there's no
ambiguity going forward. Rejected: rewriting stored `post_content` in the
database directly — the dual-read approach means already-published pages
never need touching, front-end or editor, and self-heals the moment someone
resaves.

**Any new `data-szm-*`/style-var output on an already-active effect still
breaks block validation for that block.** This is inherent to the plugin's
architecture (core blocks + `blocks.getSaveContent.extraProps`, no
`deprecated` array) and predates this change — it will happen again on every
future version that adds a new sub-setting to an effect blocks already use.
The fix is not to avoid emitting new attributes (there's no way to add a
real new setting without doing that); it's to open+resave affected pages
after deploying, exactly as `core-block-page-authoring-via-playwright`
already documented. Confirmed 2026-09-15: deploying v1.9.0 to fse-test
flagged 11 blocks on post 201 as "unexpected or invalid content" purely
because `data-szm-ease`/`data-szm-pin-start` were new; clicking "Attempt
recovery" on each + Update fixed it in one pass, content unchanged.

**Pin-start is a preset dropdown (top/half/center), not a raw offset.**
Applies to Process-steps, Horizontal-scroll, Video-scrub. Full-page-slides
is exempt (forced to top) — each panel must fill the full viewport, so any
other start point would leave a visible gap. Confirmed with the user
(grilling session, 2026-09-15) that the exemption is full-page-slides only,
even though Horizontal-scroll has a similar-looking "must fill the track"
constraint — user's explicit call, not overlooked.

**Sticky-header/admin-bar offset is automatic, not a setting**, for all four
pinned effects including Full-page-slides. `getFixedHeaderOffset()` in
`gsap-effects.js` measures whatever fixed/sticky element sits at the top of
the viewport (including `#wpadminbar`) at pin-time and folds it into the
`start` value via a function (not a static string), so it re-measures on
every `ScrollTrigger.refresh()`. Untested against a real sticky header on
fse-test (the test theme has none) — the DOM-measurement logic itself is
simple and isolated, but a real sticky-header site (e.g. the Kadence-based
studiozondermeer.nl) should get a visual check before relying on this.

**Easing is a curated preset dropdown** (Vloeiend/Strak/Elastisch/Lineair →
`power2.out`/`power4.out`/`back.out(1.7)`/`none` for GSAP,
`ease`/`cubic-bezier(...)`/`cubic-bezier(...)`/`linear` for CSS), not a raw
easing-string field. Extended to Hover and Entrance too (pre-existing plain
CSS `ease`, no prior control) for consistency, per user agreement. Not
applied to scrubbed/scroll-tied tweens (Process-steps' collapse, Horizontal-
scroll, Full-page-slides crossfade, video parallax/scrub) — those use
`ease: 'none'` by design, a curved ease there would fight the scrub. Not
applied to Marquee (continuous-speed loop, not a discrete transition).
Counter reuses the Heading block's `szmGsapEasing` (already registered
because Heading is always in the text-reveal family) rather than getting
its own attribute.

**Heading's Text-reveal + Counter stay independent**, not collapsed into the
same dropdown, because nothing stops both running on the same heading (e.g.
a "500+ klanten" stat that both counts up and splits per letter) and no
mutual-exclusivity was ever documented for that pair, unlike every other
collapsed group. User flagged (2026-09-15) this might change later — revisit
if it turns out nobody uses the combo.

### Future verification / open checks (v1.9.0)

Confirmed via Playwright against fse-test on 2026-09-15: PHP/JS syntax,
plugin active at 1.9.0, editor shows exactly 1 GSAP box per block (not up to
6), all 5 legacy-boolean blocks on post 201 pre-select the correct new
dropdown value with no manual re-picking, 0 block-recovery errors after the
required resave, 0 console errors editor + front-end, process-steps pin
still renders correctly through a real scroll sequence. Still open, in
priority order:

- **Sticky-header auto-offset never exercised against a real sticky
  header** — fse-test's theme has none, so `getFixedHeaderOffset()` only
  ever measured 0 (same as pre-1.9.0 behavior). Needs a visual check on
  studiozondermeer.nl (Kadence-based, has sticky-header customizer options)
  before trusting it there: scroll a Process-steps/Horizontal-scroll/
  Video-scrub/Full-page-slides section into its pin range and confirm the
  content isn't hidden under the header.
- **Pin-start presets (top/quarter/centered) never visually checked** —
  only the default ("top") path was exercised. Pick a non-default preset in
  the Inspector on each of Process-steps/Horizontal-scroll/Video-scrub and
  screenshot through the scroll range.
- **Easing presets never visually checked** — Vloeiend/Strak/Elastisch/
  Lineair are wired end-to-end (attribute → data-attr/CSS-var →
  GSAP-ease/CSS-timing-function) but nobody has picked "Elastisch" on a
  Slider/Accordion/Magnetic button and watched it actually look bouncy.
- **Mobile not re-checked after this refactor** — prior mobile fixes
  (slider flex-direction, video decode priming, touch-hover-stuck, see
  [[gsap-module-architecture]]) predate the pin-start/easing/header-offset
  changes; the process-steps mobile branch in particular now goes through
  `pinStartFn()` instead of its old hardcoded `'top 40px'`.
- **studiozondermeer.nl homepage not touched at all this session** — only
  fse-test post 201 was deployed/recovered/resaved. If that page still has
  any of the 5 legacy-boolean effects, it needs the same resave-to-clear-
  validation-warnings pass before it's "finished" per the block-recovery
  hard rule.

## 2026-09-16 — v1.10.0: loop, lock-heading, vertical-center, process-on-Group, transitions

Second feedback round on `/szm-gsap-demo-2/` (= fse-test post 201, renamed).
Ran another `/grilling` pass first since the ask had 9 distinct points and
several were genuinely ambiguous ("shouldnt be 6" turned out to mean "this
next point is about section 6, Horizontal scroll", confirmed by the user).

**Three items turned out to be pure bugs, fixed without a design decision:**

- **Magnetic button wasn't a plugin bug at all** — the demo page's button
  block existed with `szmGsapMagnetic: true` but empty `text`, so core/button
  rendered nothing visible. Content fix (set button text), not a code fix.
  Lesson: always inspect the actual block attributes before assuming a
  front-end effect is broken — `getBoundingClientRect`/DOM inspection on the
  rendered page found the real cause (empty `.wp-block-buttons` wrapper)
  faster than reading gsap-effects.js would have.
- **Slider "each slide further right"**: `initSliders()` forces
  `display:flex`/`flex-direction:row` inline but never reset `gap`, so WP's
  block-gap Layout setting (or a theme default) added uncorrected space
  between slides that `goTo()`'s `-100*index` math didn't account for —
  drift grew linearly with slide index. Fix: force `gap: 0 !important` on
  the slider container alongside the existing flex overrides.
- **Marquee "not truly infinite"**: only duplicated the item set once
  (`totalWidth = scrollWidth / 2`). If that single set was narrower than the
  viewport, or an image loaded late and changed width, the loop showed a
  visible gap/snap at the seam. Fix: `buildTrack()` now measures one set's
  real width via `getBoundingClientRect` (not `scrollWidth`, which doesn't
  isolate gap correctly), duplicates until content exceeds 2× viewport width
  + one set, and rebuilds on image `load` and (debounced) `resize`.

**Sticky-heading-lock (`data-szm-lock-heading`) implemented as a second,
independent `ScrollTrigger.create()` pinning the effect's own preceding
sibling, sharing the exact same `trigger`/`start`/`end` as the effect's main
ScrollTrigger, with `pinSpacing: false`.** User explicitly asked whether a
parent-level setting would be architecturally better ("or is there a better
way... or does that become too complex, 2 places to change settings?") —
decided against it: a parent-level setting would be a genuinely new pattern
in this codebase (nothing else lives on an ancestor element) and would cost
exactly the 2-places complexity the user was worried about. The per-block
toggle replicates the existing pin-start/easing pattern instead. Applied to
all 4 pinned effects (Process-steps, Horizontal-scroll, Fullpage,
Video-scrub).

**Vertical-centering (`data-szm-vertical-center`) implemented as an override
inside `pinStartFn()`**: when set, the pin-start preset dropdown is ignored
entirely and ScrollTrigger's own `'center center'` start syntax is used
instead — the block simply pins wherever it happened to be vertically
centered on screen when the pin engaged, no header-offset math needed since
it's not pinning against the top. **Deliberately not exposed on Full-viewport
slides** — those panels are always exactly 100vh/100dvh by design (same
reason they're exempt from the pin-start choice at all), so "vertically
centering" a full-viewport panel would be a no-op. Lock-heading is still
exposed there (still meaningful); vertical-center is not.

**Process-steps extended to 1-column Columns blocks and to Group blocks**,
reusing the exact same class (`.szm-gsap-process`) and runtime function for
both — `initProcessSteps()` now detects shape by counting `.wp-block-column`
children (2+ = original split behavior, 1 = single column pins itself, 0 =
must be a Group, container's own children are the steps) rather than by
block name. Registered as a 4th option in Group's existing single dropdown
(alongside Accordion/Horizontal/Fullpage) rather than a separate toggle,
keeping the "1 box per block" rule intact. User's cue ("maybe it should be
mostly on the core accordion items") was read as "reuse Accordion's
header+collapsible-content child shape," which the existing process-steps
item-collapse logic already matched with zero changes needed there.

**Process-steps scroll-length is a RangeControl (50–200%), not a preset
dropdown** — user explicitly preferred a slider here ("i prefer a slider
here tbh"), unlike pin-start/easing which use curated presets. Inconsistency
is intentional, not an oversight: presets exist specifically to hide
technical values (raw easing strings, pixel offsets) from non-technical
users, but "how much scroll per step" has no natural named categories the
way easing curves do, and every other numeric knob in this plugin
(accordion speed, counter speed, magnetic strength, slider speed) is already
a RangeControl for the same reason.

**Full-viewport transition styles**: 4 options (fade/stack/slideup/zoom),
all driven by one `data-szm-fullpage-transition` attribute read in
`initFullpage()`. Panel z-index changed from descending (`panels.length - i`,
first panel on top — correct only for fade, where stacking order is
irrelevant) to ascending (`i`, later panel on top — required for
stack/slideup/zoom, where the entering panel must visually cover the
outgoing one).

**Horizontal-scroll "stack" mode** (`data-szm-horizontal-mode`) reuses the
same stack mechanic as Fullpage's stack transition (absolute-positioned
panels, y-slide-in, scale-down-and-dim the outgoing one) but is a separate
code path in `initHorizontalScroll()`, not a shared helper — the two differ
in one structural way that made extraction not worth it: Fullpage's
container has a fixed `100dvh` CSS height already, while Horizontal-scroll's
container has no intrinsic height (it's normally sized by its flex track),
so stack mode there has to measure the tallest panel's natural height via
`getBoundingClientRect()` *before* absolutely positioning anything (absolute
children don't contribute to parent height) and set it explicitly via
`container.style.height`.

**Text-reveal/Counter "loop after idle"**: on by default (`szmGsapLoop`
defaults to `true`), not opt-in — user explicitly overrode the opt-in
recommendation ("q1 yes but on by default"). Implemented as a second,
paused `gsap.timeline({repeat:-1, delay, repeatDelay, paused:true})` built
in the initial reveal/count-up tween's `onComplete`, started/stopped by an
`IntersectionObserver` (not another `ScrollTrigger` — doesn't need to
participate in pin/scrub math, only visibility). **Both `delay` and
`repeatDelay` are set to the same value** — GSAP's `repeatDelay` only
applies *between* repeat cycles, not before the first one, so without an
explicit `delay` too the loop would start hiding the content immediately
after the initial reveal finished instead of waiting. Caught via an actual
screenshot showing counters mid-count moments after page load (looked like
the initial reveal itself was broken) — confirmed via re-screenshotting
~3s after scroll-into-view that it was in fact the loop firing early, fixed,
redeployed, and re-verified settled at final values.

### Verified this session (v1.10.0, fse-test post 201 = szm-gsap-demo-2)

PHP/JS syntax clean. Plugin active at 1.10.0. 8 blocks flagged invalid after
deploy (same recurring new-attribute-breaks-validation pattern as v1.9.0) —
recovered + resaved, 0 remaining invalid, 0 console errors. Magnetic button
now renders with real text. Slider container's computed `gap` is `0px`.
Marquee duplicates to 20 children (scrollWidth 3963px vs 1400px viewport, so
>2× coverage). Full page scroll (top to bottom, 17076px) produces 0 console
errors. Process-steps, Horizontal-scroll (sideways mode), and Fullpage
(fade transition) all screenshotted mid-pin/mid-transition and look
unchanged from pre-refactor behavior — no regressions from the
`initProcessSteps()`/`initHorizontalScroll()`/`initFullpage()` rewrites.
Text-reveal/Counter loop confirmed to wait for the idle delay instead of
firing immediately, and settles correctly at final values.

**Not verified — still open:**

- Horizontal-scroll **stack mode** and Fullpage's **stack/slideup/zoom**
  transitions were never actually selected/screenshotted — only the
  pre-existing fade/sideways-scroll defaults were re-tested. New code paths,
  unexercised.
- **Lock-heading** and **vertical-center** toggles were never turned on and
  visually checked on any effect — implemented and syntax-checked only.
- **Process-steps on a Group block** (as opposed to Columns) was never
  actually built/tested on a real page — the demo page's process-steps
  section is still the original Columns-based one.
- **Process-steps 1-column Columns** variant likewise untested on a real
  page.
- Everything from v1.9.0's still-open list (sticky-header-offset against a
  real sticky header, non-default pin-start/easing presets, mobile
  re-check, studiozondermeer.nl homepage) remains open — nothing this
  session touched those.

## 2026-09-25 — v1.11.0: "Fade-in reveal" entrance-variant (nixowebbuilding.nl 04A)

Eerste pilot van de workflow concurrent-analyse → plugin (analyse in
`~/Projects/SZM/docs/research/animaties/nixowebbuilding/04-reveals/`).

**Eigen variant, niet de bestaande slide-up aangepast.** Mechanisch is het
hetzelfde als `slide-up` (IntersectionObserver + CSS-transitie), maar de
gebruiker vond het "uniek genoeg om zijn eigen variatie te bezitten". Verschil:
24px i.p.v. 32px, 400ms i.p.v. 800ms (gezet bij kiezen in de dropdown, alleen
als de snelheid nog op de standaard stond), en een vroegere trigger (threshold
0.1 / rootMargin −50px, eigen observer in `frontend.js`).

**Schuifafstand-attribute zonder default.** `szmEntranceDistance` heeft geen
default; alleen als de gebruiker de slider aanraakt wordt
`--szm-entrance-distance` opgeslagen. Zo krijgen al gepubliceerde slide-up-blokken
geen nieuwe style-var en dus geen block-recovery (zie v1.9.0-notitie). De CSS-
fallbacks (32/24px) en `ENTRANCE_DISTANCE_DEFAULTS` in `editor.js` moeten gelijk
blijven. Geverifieerd: post 201 na deploy 104 blokken, 0 ongeldig.

**Entrance op 20 core-bloktypes** (was 4), gebruiker: "zo veel mogelijk wat
daadwerkelijk logisch is". Wel: tekst, lijst, citaat, media, knoppen, tabel,
details, scheidingslijn, social links. Niet: spacer, navigatie, template-parts.
Conflictcheck met GSAP: alleen Marquee zet `x` op het blok zelf (de `<ul>`) —
daar valt Entrance terug op alleen fade (`.szm-gsap-marquee.szm-entrance`).
Video- en magnetic-effecten animeren een kind-element, geen conflict. Stagger-
slider alleen op blokken die kinderen kunnen hebben (`ENTRANCE_STAGGER_BLOCKS`).

**Niet gedaan:** nixo's `html.js`-vangnet (nu blijft entrance-content onzichtbaar
als `frontend.js` niet laadt); Marquee+Entrance-combinatie niet live getest.

## v1.12.0 — preview-GIF onder elke effect-keuze (2026-09-25)

- **Wens:** na het kiezen van een effect in de Inspector een GIF-je zien van wat het doet, goedkoop te maken binnen `/animatie-volledige-flow`.
- **Werking:** `szm_ha_get_preview_keys()` globt `assets/previews/*.gif` en geeft de sleutels door (`previews`, `previewUrl`). `previewFor(key)` in `editor.js` toont het `<img>` onder de gekozen optie, of niets als er geen bestand is. Sleutel = `<as>-<waarde>` (`hover-lift`, `entrance-reveal`, `columns-slider`, `group-accordion`, `video-scrub`, `text-chars`) of de toggle-naam (`counter`, `magnetic`, `marquee`). Geen nieuwe block-attributes, dus geen validatierisico.
- **Bron van de GIF (keuze gebruiker):** het origineel van de concurrent voor gepullde effecten (nu alleen `entrance-reveal`, nixowebbuilding 04A). Effecten zonder concurrent-origineel (de rest) zijn opgenomen van ons eigen effect op fse-test: opnamepagina `/szm-previews/` (post 680, `tools/previews/blokken.js`) plus `szm-gsap-demo-2` en `szm-new-hover-effects-demo`. Opnieuw opnemen: `tools/previews/opnames.sh [filter]`.
- **Opname:** `~/.claude/skills/site-animatie-analyse/scripts/gif.js` (Chrome-screencast + ffmpeg, 320px, 96 kleuren). Gotcha's in de skill-`decisions.md`.
- **Geverifieerd:** alle 28 GIF's via contactsheets bekeken (beginstand → beweging), Inspector-screenshots voor Entrance (Fade-in reveal) en GSAP (Slider), editor-check 680 + 201: 0 ongeldig, 0 recovery.
- **Beperkt:** hover-spread en hover-tilt zijn in 320px subtiel; video-GIF's 230–370 KB (lazy geladen, alleen in de editor). Sub-presets (fullpage-overgang stack/slideup/zoom, horizontal stack) hebben geen eigen GIF.

## 2026-09-25 — v1.13.0 "Toepassen op kind-blokken" (entrance + hover)

- Container kiest "Toepassen op: Dit blok / Kind-blokken" (entrance: `ENTRANCE_STAGGER_BLOCKS`; hover: group/cover/column). Opgeslagen als `szm-entrance-children` + `data-szm-entrance-children="{variant}"` + `data-szm-stagger`; hover `szm-hover-children` + `data-szm-hover-children`. Default `self` = oude markup ongewijzigd (geen block recovery). Volgorde van style-keys in addSaveProps niet wijzigen.
- Doelen worden op de front-end bepaald (`collectTargets` in frontend.js), niet als attribute in elk kind opgeslagen: verplaatsen/toevoegen van blokken en synced patterns blijven kloppen. Editor spiegelt dezelfde regels (`isPassThroughBlock`, `countChildTargets`, `findInheritingParent`) voor de "Animatie via ouder-blok"-melding en de teller.
- Doorzichtig (item-containers, hun kinderen animeren los): columns, buttons, gallery, social-links, group met grid-layout of rij (flex horizontaal). **Stapel (flex verticaal) en gewone groep niet**: dat is meestal een kaart die als één geheel moet binnenkomen (Grid > Kaart-groep > inhoud).
- Eigen entrance/hover op een kind wint; tekst-reveal telt als eigen entrance (anders dubbel). GSAP-containers zijn nooit doorzichtig maar animeren als één geheel.
- Stagger = wachtrij per ouder (`setStaggerDelay`): elk kind dat onthuld wordt start ≥ stap ms na het vorige. Alles tegelijk in beeld → 0,1,2… × stap; lang grid → stagger loopt per binnenscrollende rij door. Gekozen boven "alles start als ouder in beeld komt" (dan animeren onderste rijen buiten beeld).
- FOUC: `.szm-entrance-children:not(.szm-children-ready){opacity:0}` tot frontend.js de kinderen heeft voorzien.
- GSAP bewust niet meegenomen (user akkoord): GSAP-effecten werken al op containerniveau.
- Testpagina: fse-test post 684, /szm-kinderen-animatie/.
