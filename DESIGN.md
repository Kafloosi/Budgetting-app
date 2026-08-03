# Design

<!-- impeccable:design-schema 1 -->

## World

Airmail. The postal system's graphic language: manila and paper white, the
red-and-blue barber stripe, the die-cut window, the franking impression, the
typewritten serial.

The fit is not decorative. Household budgeting *is* the envelope method —
one pool of money partitioned into containers, spent down, carried over when
a container is not emptied, and handed between people. An envelope has a
window you read the amount through, a flap that opens, a weight you can feel
before you count, and an address naming who it is for. Every one of those is
a thing this product already does and was drawing as a flat rule.

This is a postal *system*, not paper skeuomorphism. No photographic texture,
no torn edges, no drop-shadowed realism, no leather or stitching. The world
arrives through palette, die-cut geometry, the stamp, the stripe, and the
sort.

**This file describes what is built.** Devices the world specifies but the
app does not yet draw live under Unbuilt, and nowhere else. A design file
that describes an app which does not exist is worse than a smaller true one.

## Structure

- **The envelope is the container.** One envelope holds one thing: a
  category and its budget, a person and their balance, a settlement. An
  envelope inside an envelope is a mistake; a run of them is the page.
- **Depth is paper.** In light, the envelope lifts on a short warm offset
  shadow — never a diffuse Material halo and never a glow. `lift()` in
  `theme.ts` is the only source of elevation, and it is rationed: an ordinary
  envelope takes level 1, the primary action level 2, and the chrome that
  floats over everything (tab rack, undo slip, add button) level 3.
- **The window is the meter.** A budget's remaining room is a die-cut
  aperture — a hairline-bordered track with the fill showing through it — not
  a progress bar laid on top and not a ring. The border is the cut; without
  it this is a progress bar.
- **The die-cut is 4px.** The softening a real envelope die leaves. Nothing
  takes a pill or a 16px card radius.
- **The address block sets the composition.** Label left and flush, figure
  right against a drawn line, secondary detail beneath the label in the
  smaller register. This is the postal addressing convention and it is why
  figures bank right in a column down the screen.
- **The stripe carries structure, not ornament.** The red/blue barber
  diagonal marks an edge that carries meaning. It is built as `BarberStripe`
  from rotated slashes inside a clip — the app ships no SVG or gradient
  dependency — and it currently marks the active slot in the tab rack. It
  never fills a region and never runs along an inert boundary.

## Colour

Restrained: paper and ink, with the two airmail primaries rationed to
meaning. The user did not ask for more colour, so colour stays load-bearing.

These are the values in `src/theme.ts`. Light runs card > ground > manila
from lightest to darkest, and dark mirrors it — a recessed plane is darker
than the envelope in both.

| Role | Light | Dark | Means |
| --- | --- | --- | --- |
| card | `#FFFDF8` | `#2C291F` | the envelope — the substrate of every screen |
| ground | `#F2EFE6` | `#14130F` | what the mail lies on |
| manila | `#E8DCC0` | `#0E0D09` | a recessed plane: a window's track, a rail |
| ink | `#1A1A18` | `#F4F2EA` | structure and body |
| inkSoft | `#5F5C52` | `#9B978A` | secondary text |
| **red** | `#D0212B` | `#F2564F` | money out, over limit, one half of the stripe |
| **blue** | `#1F4E9C` | `#6E9BE8` | money in, active edge, primary action, the other half |
| **orange** | `#CC5A14` | `#F08A3C` | a limit within reach |
| glassine | `#FFFFFF` @ 62% | `#FFFFFF` @ 10% | a window's pane *(unused — see Unbuilt)* |

**Depth resolves differently per theme, deliberately.** In light the envelope
lifts on a warm offset shadow. In dark, a shadow on a near-black ground is
nothing, so the envelope carries its own depth by sitting visibly lighter
than what it lies on. Do not "fix" dark by adding shadow.

Rules for colour:

- A primary may fill a **window's contents, a stamp, a stripe, an active
  edge, or a numeral**. It may not fill an envelope body or a whole plane.
- Never two primaries competing inside one envelope. The stripe is the one
  place red and blue appear together, and that is what makes it a mark.
- Category colours stay data, expressed as the **stamp block** beside the row
  — never as a tinted background or a pill. The stamp carries a hairline
  perforated edge, which is what keeps a marker findable when its colour was
  saved under an older palette and sits close to the ground it is drawn on.
- **Stamp inks clear 3:1 against both the light envelope and the dark one.**
  That is the rule, and `personColors` satisfies it. (An earlier draft stated
  it as a luminance band of 0.22–0.29; half the palette sits at 0.147–0.178
  and still clears 3:1, so the band was a wrong description of a right
  outcome.) A colour that only works in one theme is not a stamp ink.
- Manila is a recessed plane, not an envelope body — the track a window is
  cut into, the rail a segmented control runs in.
- Light and dark are both first-class: this app is used in a supermarket at
  midday and on a sofa at night.

## Type

Two faces, bundled with the app — no runtime fetch, ever.

- **Archivo** (400/500/600/700) — the register. Labels, body, controls,
  headings, and figures. A grotesk from the job-printing lineage: official
  without being neutral, and it carries `tabular-nums`.
- **Courier Prime** (400/700) — the typewriter register, for what the postal
  world types rather than prints. It renders in two places: a window's
  spent-of-limit pair, and the typed annotation beneath it ("+€12,00 carried
  over"). Monospaced, so those columns align structurally rather than by
  font-feature support.

- **Money is always tabular.** `figures` spreads `fontVariant:
  ['tabular-nums']` into every amount. This remains the single most
  load-bearing type decision in the app.
- **Weight picks a file, not a synthetic.** `components/Text.tsx` maps
  `fontWeight` to the actual Archivo file, because Android otherwise
  synthesises a smeared bold from the regular. A style that names a
  `fontFamily` outright opts out — which is how the Courier register and the
  indicia get their faces, and why those styles must never also set
  `fontWeight`.
- Labels are lowercase and flush left. Indicia — the few all-caps postal
  marks, currently the tab labels, UNDO, and the stamp — take letterspacing
  and never exceed 11sp.
- Sizes are `sp` through `ms()`, so system font scaling still works.

## Motion

Motion is the postal handling of a piece of mail. All of it respects the
system "remove animations" setting by collapsing to an instant cut.

- **The frank.** Recording an entry lands a stamp impression: scale from
  1.25 with a small rotation settling to rest, 180ms, one overshoot. This is
  the app's signature moment. It fires only on a genuinely new commit — Home
  is conditionally mounted, so it guards against replaying on remount.
- **The sort.** Rows enter staggered 28ms apart, capped at the eight visible
  at first paint so a long list never crawls.
- **The flap.** Slips arrive from their **top** edge on an exponential
  ease-out over 220ms — the sign matters, sliding up from below is the thing
  this refuses.
- **The fill.** A window's contents move to a new ratio over 400ms on a
  transform with `transformOrigin: 'left'`, so it stays on the UI thread.
- **The travel.** The stripe marking the active tab travels to its new slot
  rather than blinking on and off, 260ms. `SlidingPlane` does the same for a
  re-partitioned view — a different person on Home, a different period on
  Stats — and the edge it came from carries colour for the length of the
  move.

Nothing else animates: no hover, no entrance animation on static chrome, no
transition on a control that merely changed state.

## Unbuilt

Devices this world specifies that the current build does not draw. Recorded
here so the system stays whole and the rest of this file stays true:

- **The overlapping stack.** Both direction contracts promise "a
  foreshortened stack of envelopes, the edges of the rest showing behind
  it". Envelopes are separated by a gap, not overlapped. This is the most
  vivid image in the world and it is absent.
- **The flap as a fold, and as sheet behaviour.** The flap is a translate,
  not a rotation along a diagonal edge, and every actual modal still uses the
  OS `slide`/`fade`. Only the undo slip flaps.
- **The glassine pane.** The token exists in `theme.ts` and nothing uses it.
- **The registered-mail serial.** Settlements are a first-class record in the
  product and should carry a typed serial; they do not.
- **The stripe beyond the tab rack.** It should also mark an over-limit
  envelope and the head of a settlement record.
- **The tab push.** Changing tabs swaps content without the outgoing
  envelope going back and the incoming one coming forward.
- **The widget.** `src/widget/BudgetWidget.tsx` takes the new palette but
  keeps `borderRadius: 20` and none of the die-cut, stripe or window. It is
  the one surface a user sees without opening the app.
- **Per-screen composition.** Stats, Split, History, Settings, Onboarding and
  the shared forms inherit the new primitives but have not had a composition
  pass of their own. On Add in particular, nine joined cards mean most of the
  screen carries no lift.
- **Ornament density generally.** No perforation, cancellation marks,
  par-avion border, franking rings or registered-mail box. The honest read is
  that this is a sound foundation for Airmail that does not yet *look* like
  Airmail from across a room.

## What this world refuses

- Photographic paper texture, torn edges, stitching, leather, realism.
- The fintech rut: rounded card stacks on grey, a donut of categories,
  pastel category pills, a mint or purple accent.
- Diffuse elevation halos, glass, blur, gradients, glow.
- Progress rings and sparklines standing in for figures.
- Pill radii and 16px card corners; the die-cut is 4px.
- Decorative emoji, per a standing product commitment.
