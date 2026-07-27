# Design

<!-- impeccable:design-schema 1 -->

## World

The Rietveld Schröder house. One small room is made into many by sliding
planes; nothing is hidden behind ornament, every joint stays visibly honest,
and colour appears only on the edges that actually move. The budgeting app
does the same job: one set of money, partitioned per person or combined,
re-composed rather than re-rendered.

This is not a De Stijl pastiche. Mondrian's canvas is a picture; Rietveld's
house is a machine you operate. We build the machine.

## Structure

- **Planes, not cards.** A screen is planes of ground butted against one
  another and divided by structural rules. There are no floating containers,
  and a plane inside a plane is a mistake.
- **Everything is orthogonal.** `borderRadius: 0` everywhere. No rounded
  corners on any surface, control, input, or swatch.
- **No shadows, no elevation, no glass.** Separation is a drawn rule, never a
  blur. Depth does not exist in this world; adjacency does.
- **Rules carry the hierarchy.** Two weights only: `hairline` divides items
  inside one plane, `structure` (2px) divides one plane from the next. A third
  weight means the layout was not decided.
- **Content sits flush to its plane edge.** Text aligns to the rule, not to a
  centred inset. Asymmetry is the composition; centred layouts are refused
  except for the numeric column, which is right-aligned so digits line up.

## Colour

Ground and ink are neutral. The three primaries are rationed to edges that
carry meaning, never spread across a surface.

| Role | Light | Dark | Means |
| --- | --- | --- | --- |
| ground | `#FFFFFF` | `#111111` | the plane |
| groundAlt | `#F2F2F0` | `#1B1B1B` | a recessed plane |
| ink | `#111111` | `#F4F4F2` | structure and body |
| inkSoft | `#6B6B6B` | `#9A9A98` | secondary text |
| **red** | `#D62828` | `#F0524B` | money out, over limit |
| **blue** | `#1D4ED8` | `#5B8DEF` | money in, the active edge, primary action |
| **yellow** | `#F4B400` | `#F4C13C` | attention: near a limit, unsettled |

Rules for colour:

- A primary may fill a **meter fill, a moving edge, a selected control, or a
  numeral**. It may not fill a whole plane or a large region.
- Never two primaries competing inside one group.
- Category colours stay as data, expressed as a **4px edge marker** against
  the rule — never as a filled chip or a soft tinted background.
- Light/dark is not a style preference here: this app is used one-handed in a
  supermarket at midday and again on a sofa at night, so both are first-class
  and every colour above resolves in each.

## Type

System stack (Roboto on Android, SF on iOS) — the Operate register is served
by a workhorse face, and shipping a webfont in a native app buys nothing the
task needs.

- **Money is always tabular.** `fontVariant: ['tabular-nums']` on every
  figure, so columns of digits align down the screen. This is the single
  most load-bearing type decision in the app.
- Labels are lowercase and set flush to the rule. The old tracked-uppercase
  eyebrow over every section is gone.
- Scale steps are obvious: a balance is set large enough to read at arm's
  length; everything supporting it drops hard rather than gently.

## Motion

One authored moment, not scattered transitions: **the plane slide.** When the
view partitions — switching person, opening an entry to edit, revealing a
month behind the current one — the plane moves and the moving edge carries its
primary colour for the duration of the movement. Every slide is reversible,
and nothing else in the app animates for decoration.

## What this world refuses

- Rounded corners, shadows, elevation, glass, gradients.
- Cards as page scaffolding, and any nested card.
- Pastel or tinted category chips.
- Progress rings and sparklines standing in for figures.
- Decorative emoji, per a standing product commitment.
