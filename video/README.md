# Social videos

Short loops of real Coral controls, for sharing. Each one is a page that
mounts the real component on a small document and drives it with a scripted
cursor, framed with the [stageshow](https://github.com/benjitaylor/skills)
kit in `kit/` (vendored, with one change: `.ss-native` exempts a subtree from
the kit's host resets so Tailwind styles still apply).

## Layout

`layout/`: Row → the middle spot → Gap scrubbed to 28 → Column → Default.
12.3s, loops seamlessly, 1080×1350 (4:5).

- The cursor is drawn by the stage; each press also clicks the real element,
  so the canvas shows the component's own output.
- Layout changes on the canvas are played as FLIP motion (`Canvas`), and the
  panel's rows fade in and out as the control mounts them (`PanelMotion`).
  Neither exists in the product; they're for the video.

## Transition

`transition/`: open the row → Duration scrubbed 0.3→0.8s → the Bézier's
second handle dragged past 1 (overshoot) → Time (a spring) → Bounce scrubbed
to 0.6 → Easing (back to the defaults) → close. 17.6s, loops seamlessly,
1080×1350 (4:5, a 500×625 stage).

- A card on the canvas replays the layer's transition after each change,
  alternating sides, so every curve is seen as motion. Its ends are inset so
  a bouncy spring's overshoot stays on the track.
- Base UI portals the popover to `<body>`. `PortalHome` redirects React's
  `<body>` inserts into the scene while the video is mounted, so the stage
  crops and records it under the cursor.
- The chart swap between Bézier and spring is crossfaded for the video; the
  product swaps it outright.

## Box model

`box-model/`: padding scrubbed to 14px (all four sides linked) → "Use a
token…" → Left & right → hover `space.section`, then `space.inset` (the card
previews each) → pick `space.inset` (left and right show 24px marked as a
token, and the list under the diagram says which token is where) → Reset.
13.8s, loops seamlessly, 1080×1350 (a 560×700 stage).

- The selected card's padding is tinted and its content left white, the way
  the diagram draws them, so padding changes are seen on the canvas.
- `Canvas` renders the layers itself (as the docs' `LayerStage` does) so it
  can show the token being hovered before it's picked, and defines the
  tokens' custom properties around them.
- Four tokens only, so the list fits beside the diagram without being pushed
  up from the stage's foot (which made it jump as it closed).
- For the video only: number fields and token chips grow in as they swap,
  and the tokens-in-use list fades in.

## Scrub field

`scrub-field/`: hover the Size field (the scrub handle shows) → drag 20px to
48px → unit menu → rem (3rem; the headline keeps its size) → drag in rem
(it steps in tenths, to 2rem) → click to type `20px`, Enter (typing a unit
switches back). 13.4s, loops seamlessly, 1080×1350.

- A close-up by stage size, not by zoom: a 360×450 stage recorded at 3×, so
  the Select's popup (a portal) positions without a transform in the way.
- The field gets real pointer events (`pointer()` in `shared.tsx`), so the
  drag threshold, snapping, fill and click-to-type are the field's own.
- Typing is at a person's pace (120ms a key) with real input events. A
  field applies a typed number once typing pauses (`LIVE_DELAY_MS` in
  `UnitField.tsx`), so `20px` typed into a rem field never shows 20rem.

Shared helpers (store bridge, `PortalHome`, real pointer events, aiming the cursor at real controls, pressing
them as a pointer would) are in `shared.tsx`.

## Recording

```bash
bun run dev
```

```bash
node video/record.mjs http://localhost:5173/video/layout/ --out video/out/layout.mp4
```

`?record` installs the kit's virtual clock, so the recorder steps time one
frame at a time and screenshots each: no dropped frames, however slow the
machine. It records exactly one loop. Needs ffmpeg (`brew install ffmpeg`)
and Chrome. A hot reload mid-recording (an edit under `src/`) aborts it; run
it again.

Preview a still or a contact sheet with stageshow's filmer:

```bash
node ~/.claude/skills/stageshow/scripts/film.mjs "http://localhost:5173/video/layout/" --select '.lv' --gate
```
