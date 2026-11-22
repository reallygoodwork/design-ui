# Social videos

Short loops of real Design UI controls, for sharing. Each one is a page that
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

## Agent guardrails

`agent/`: a task assigned to the agent → it rewrites the headline (allowed,
logged with a reason) → a 48px title (refused by `title-size`) → hot pink on
the button (refused by `brand-colors`) → a brand token (allowed) → deleting
the image (refused by `card-layout`) → pull back on the whole log. About 20s,
loops through a fade, 1080×1350 (a 600×750 stage). The first of the ten
social videos: "Let AI edit your designs without wrecking them."

- Framed as a screen recording: the app on a graphite wallpaper, cropped to
  portrait as a recorder exports a wide window, the camera pushing in on each
  moment, and a one-line caption in a lower third.
- The editor is drawn, not mounted, so the whole app fits the frame. The
  refusals are real: every message is what `@design-ui/core`'s rules engine
  says when the agent's action is checked (`attempt()` in the script), and a
  console error says if the rules stop telling this story.
- Gate: two lines are kept on purpose. A desktop window in a 4:5 frame is
  taller than wide (the brief's look), and the task field reads as an
  unevenly padded card while it's half typed.

## Roles handoff

`roles/`: as a builder, select the title and drag Size 24 → 30 → switch the
role to Editor (the Typography and Layout fields lock, Color stays open, a
notice says rules apply) → rewrite the headline on the canvas (allowed) →
drag Size again (refused by `title-style`) → pull back. About 20s,
1080×1350. The second social video: "Hand off a page without handing over
the keys."

- Shares the agent video's frame and editor styles (`../agent/agent.css`),
  with an inspector on the right; the whole window's width is in shot.
- Which fields lock for the editor (`allowed()`), and the refusal, come from
  the rules engine; a console error says if the rule stops telling this story.
- Gate: one line kept on purpose, the portrait window, as in the agent video.

## Rules guardrails

`rules/`: as a builder, select the card → Rules tab → Lock structure →
tokens only for Color → Editor preview → type `#FF0000` into Background,
Enter (refused by the card's rule) → exit the preview → ⌘Z, ⌘Z (the rules
come off) → pull back. About 21s, 1080×1350. The third social video:
"Brand guardrails in 10 seconds. No JSON."

- The rules are built with `updateLayerRule`, as the editor's Rules tab
  builds them, and the refusal is `checkAction`'s own.
- Shares the agent and roles videos' styles; keycaps show at the top so they
  clear the caption.
- Gate: the same deliberate portrait-window line.

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
