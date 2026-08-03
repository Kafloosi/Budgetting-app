# Design

<!-- impeccable:design-schema 1 -->

## World

Airmail. The postal system's graphic language: manila and paper white, the
red-and-blue barber stripe, the die-cut window, the gummed flap's diagonal,
the franking impression, the registered-mail serial.

The fit is not decorative. Household budgeting *is* the envelope method —
one pool of money partitioned into containers, spent down, carried over when
a container is not emptied, and handed between people. An envelope has a
window you read the amount through, a flap that opens, a weight you can feel
before you count, and an address naming who it is for. Every one of those is
a thing this product already does and was drawing as a flat rule.

This is a postal *system*, not paper skeuomorphism. No photographic texture,
no torn edges, no drop-shadowed realism, no leather or stitching. The world
arrives through palette, die-cut geometry, the stamp, and the sort.

## Structure

- **The envelope is the container.** One envelope holds one thing: a
  category and its budget, a person and their balance, a settlement and its
  serial. An envelope inside an envelope is a mistake; a stack of them is
  the page.
- **Stacks have depth, and the depth is paper.** Envelopes overlap with
  their edges showing. Shadow is short, tight and slightly warm — paper on
  paper at 2–6px, never a diffuse Material elevation halo and never a glow.
- **The window is the meter.** A budget's remaining room is a die-cut
  rectangle with the fill showing through it, not a progress bar laid on
  top and not a ring. The window is cut *into* the envelope, so the fill
  reads as contents rather than as chrome.
- **The flap is the shape motif.** Sheets, menus and expandables open along
  a diagonal flap edge. Corners take a 4px die-cut radius — the softening a
  real envelope die has — and nothing takes a pill or a 16px card radius.
- **The address block sets the composition.** Label left and flush, figure
  right against a drawn line, secondary detail beneath the label in the
  smaller register. This is the postal addressing convention and it is why
  figures bank right in a column down the screen.
- **The stripe carries structure, not ornament.** The red/blue barber
  diagonal marks an edge that matters — the active tab, an over-limit
  envelope, the head of a settlement record. It never fills a region and it
  never runs along an inert boundary.

## Colour

Restrained: paper and ink, with the two airmail primaries rationed to
meaning. The user did not ask for more colour, so colour stays load-bearing.

| Role | Light | Dark | Means |
| --- | --- | --- | --- |
| paper | `#FBFAF7` | `#16150F` | the ground |
| manila | `#E8DCC0` | `#2A2718` | an envelope body, a recessed plane |
| ink | `#1A1A18` | `#F4F2EA` | structure and body text |
| inkSoft | `#5F5C52` | `#9B978A` | secondary text |
| **red** | `#D0212B` | `#F2564F` | money out, over limit |
| **blue** | `#1F4E9C` | `#6E9BE8` | money in, active edge, primary action |
| **orange** | `#CC5A14` | `#F08A3C` | a limit within reach, unsettled |
| glassine | `#FFFFFF` @ 62% | `#FFFFFF` @ 10% | a window's pane |

Rules for colour:

- A primary may fill a **window's contents, a stamp, a stripe, an active
  edge, or a numeral**. It may not fill an envelope body or a whole plane.
- Never two primaries competing inside one envelope.
- Category colours stay data, expressed as the **stamp block** beside the row
  — never as a tinted background or a pill. The stamp carries a hairline
  perforated edge, which is what keeps a marker findable when its colour was
  saved under an older palette and sits close to the ground it is drawn on.
- **Stamp inks are held to a luminance band** (roughly 0.22–0.29) so the same
  eight colours clear 3:1 on the light envelope and the dark one, and still
  take a readable label when one fills a chip. A colour that only works in one
  theme is not a stamp ink.
- Manila is the envelope; paper is the ground behind it. Both resolve in
  dark, where manila becomes a dark umber rather than a grey.
- Light and dark are both first-class: this app is used in a supermarket at
  midday and on a sofa at night.

## Type

Two faces, bundled with the app — no runtime fetch, ever.

- **Archivo** (400/500/600/700) — the register. Labels, body, controls,
  headings, and figures. A grotesk from the job-printing lineage: official
  without being neutral, and it carries `tabular-nums`.
- **Courier Prime** (400/700) — the typewriter register, used only where
  the postal world types rather than prints: serials, reference codes,
  stamp impressions, and settlement receipts. Monospaced, so those columns
  align structurally rather than by feature support.

- **Money is always tabular.** `figures` spreads `fontVariant:
  ['tabular-nums']` into every amount. This remains the single most
  load-bearing type decision in the app.
- Labels are lowercase and flush left. Indicia — the few all-caps postal
  marks like a tab label or a stamp — take letterspacing and never exceed
  11sp.
- Sizes are `sp` through `ms()`, so system font scaling still works.

## Motion

Motion is the postal handling of a piece of mail, authored as four moments
rather than scattered transitions. All of it respects the system
"remove animations" setting by collapsing to an instant cut.

- **The frank.** Recording an entry lands a stamp impression: scale from
  1.25 with a small rotation settling to rest, 180ms, one overshoot. This
  is the app's signature moment and it fires only on a committed entry.
- **The sort.** Lists enter as a stagger of 28ms per row sliding a short
  distance from the stack, capped at eight rows so a long list never
  crawls.
- **The flap.** Sheets and expandables open along the flap diagonal from
  their top edge, 220ms on an ease-out, rather than sliding up from below.
- **The fill.** A window's contents spring to a new ratio over 400ms and
  the figure beside it counts to its new value, so a budget visibly moves
  rather than jumping.

Tab changes push the outgoing envelope back and bring the incoming one
forward. Nothing else animates: no hover, no entrance animation on static
chrome, no transition on a control that merely changed state.

## What this world refuses

- Photographic paper texture, torn edges, stitching, leather, realism.
- The fintech rut: rounded card stacks on grey, a donut of categories,
  pastel category pills, a mint or purple accent.
- Diffuse elevation halos, glass, blur, gradients, glow.
- Progress rings and sparklines standing in for figures.
- Pill radii and 16px card corners; the die-cut is 4px.
- Decorative emoji, per a standing product commitment.
