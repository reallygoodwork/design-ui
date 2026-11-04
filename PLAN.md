# PLAN.md — Coral Design: review bug fixes + layer-tree highlight

## Context

A staff-level review of the codebase (Nov 2026) found 9 bugs. Bugs 1–4 were reproduced by running
the reducer in a scratch script; bugs 5–9 were confirmed by reading the code. The latest feature
(breakpoints) is effectively broken on the canvas, and undo/redo is broken. This plan fixes each bug
with a regression test, then ships the Figma-style layer-tree highlight. The fixes come before the
bigger architecture work (flat node map, iframe rendering, core package, MCP).

Execution is orchestrated by the main session and done by two sub-agents, `bug-fixer` and `verifier`.
See **Execution with sub-agents** below.

Decisions already made by the user:
- **Bug 9:** disable canvas drag for now. Don't commit a position.
- **Feature:** Figma-style **descendant** tint. This replaces the ancestor tint built earlier.

## Tasks and dependencies

**Rule:** tasks that edit the same file run in sequence. Tasks with no file in common run in parallel.
The feature is blocked by every bug that changes the layer hierarchy it renders.
Bugs 2–4 are one task (`H`) because they're a single history rewrite.

### Files each task edits (verified with grep)

| Task | Edits | Tests (new) |
|---|---|---|
| **T0** Test infra | `package.json`, `bun.lock`, `vite.config.ts`, `hooks/useDesigner.ts` (exports only), `test/fixtures.tsx`, `biome.json` (exclude `*.md`) | `test/fixtures.test.tsx` |
| **B1** Insert duplication | `hooks/useDesigner.ts` | `hooks/useDesigner.test.ts` |
| **H** Bugs 2+3+4 History | `hooks/useDesigner.ts`, `hooks/useHistory.ts`, `components/DesignerCanvas.tsx` (`DELETE_LAYERS`) | `hooks/useDesigner.test.ts` |
| **B5** Breakpoint overrides | `lib/Types.ts`, `components/BreakpointFrame.tsx`, `lib/layers/{frame,text,image,input}.tsx`, `components/DesignerCanvas.tsx` (rect dependency) | `components/BreakpointFrame.test.tsx` |
| **B6** Frame styles | `components/BreakpointFrame.tsx`, `lib/layers/text.tsx` (defaults) | `components/BreakpointFrame.test.tsx` |
| **B7** Button root | `components/BreakpointFrame.tsx` | `components/BreakpointFrame.test.tsx` |
| **B8** Text children | `lib/layers/text.tsx`, `hooks/useDesigner.ts` (guard) | `hooks/useDesigner.test.ts` |
| **B9** Disable drag | `components/DesignerCanvas.tsx` | `components/DesignerCanvas.test.tsx` |
| **F** Subtree tint | `components/PaneLayerTree.tsx` | `components/PaneLayerTree.test.tsx` |

(Paths are relative to `src/`. `B8` and `F` read `supportsChildren` in `DesignerCanvas.tsx`,
`StructureAble.tsx` and `PaneLayerTree.tsx` but don't edit those files for it.)

**Plan amendments (approved by the user, Nov 2026):**
- T0 also edits `biome.json` to exclude `*.md`. Biome 2.6 formats Markdown and fails `bun run lint`
  on `README.md`, and its formatter would break the YAML frontmatter in `.claude/agents/*.md`.
- The shared fixture is `src/test/fixtures.tsx`, not `.ts`, because it contains JSX.
- H: `getCoalesceKey(action, activeBreakpointId): string | null` takes the active breakpoint as a
  second argument, which the `css:` key's fallback needs. `State` gains `lastCoalesceKey: string | null`
  to track the current run. The user reviewed and kept the coalescing policy (keys as suggested; no
  time-gap split).

### Dependency list

| Task | Blocked by | Why |
|---|---|---|
| T0 | — | Every task needs the test runner, the fixtures and the exported reducer |
| B1 | T0 | |
| B9 | T0 | |
| B5 | T0, **B9** | Both edit `DesignerCanvas.tsx`; B9 is tiny, so it goes first |
| H | **B1**, **B5** | `useDesigner.ts` (B1); `DesignerCanvas.tsx` (B5) |
| B6 | **B5** | `BreakpointFrame.tsx` and `text.tsx` |
| B7 | **B6** | `BreakpointFrame.tsx` |
| B8 | **H**, **B6** | `useDesigner.ts` (H; B8's "no history entry" check needs the new `past` stack); `text.tsx` (B6) |
| F | **B1**, **B8** | Layer-hierarchy area: B1 removes duplicate IDs (which break tree keys and the descendant walk); B8 changes which nodes can have children and the tree's drop rules |

### Execution waves

```
Wave 0:  T0
Wave 1:  B1  ∥  B9
Wave 2:  B5                      (after B9)
Wave 3:  H   ∥  B6               (H after B1+B5; B6 after B5)
Wave 4:  B7  ∥  B8               (B7 after B6; B8 after H+B6)
Wave 5:  F                       (after B1+B8)
```

Critical path: `T0 → B9 → B5 → H → B8 → F` (6 steps).

**Done when:** a fresh `verifier` that didn't write the fix returns PASS for the branch's current
HEAD (the fixer's own report never counts), it's merged into
`fix/review-bugs`, the global gate is green on the merged branch, and its box is checked below.

- [x] T0 · [x] B1 · [x] B9 · [x] B5 · [x] H · [x] B6 · [x] B7 · [x] B8 · [x] F

**Verdict log:**
- T0: PASS at `ad81b8b` after 2 retry rounds (CONCERNS ×2: `biome.json` scope and fixture name, both approved as amendments; then fixture helpers not exercised, fixed). Merged as `42a0b1c`.
- B9: PASS at `23eeff2`, first round. Merged as `bce2d23`. Manual browser check still pending (end of run).
- B1: PASS at `d62a130`, first round (after the worktree-base restart). Merged as `ae9e825`.
- B5: PASS at `9c00f71`, first round. The verifier confirmed all 4 new tests fail on the old source. Merged as `ee6cadf`.
- B6: PASS at `5893f38`, first round. Merged as `d984a1e`. Verifier notes (non-blocking): the text default `--color: #000000` still shadows the frame colour for new text, and `FontLoader` ignores the frame font.
- H: PASS at `c5f02b5` after 1 retry round. CONCERNS: controlled-mode `SET_LAYERS` echo broke coalescing (fixed); signature deviation (user approved the amendment). Merged as `c6409d3`. Adds 1 lint warning (`applyAction` complexity 17 > 15).
- B7: PASS at `b2c10c0` after 1 retry round, with a browser check. CONCERNS: the DOM-nesting test didn't discriminate, so a no-`button`-ancestor assertion was added. Merged as `3f55114`.
- B8: PASS at `3d05d65`, first round, with a browser check (no 'inside' button on text; a tree drop onto text only reorders). Merged as `3295606`. Note: the guard raises the `applyAction` complexity warning from 17 to 21; no test yet that a blocked action preserves a coalescing run.
- F: PASS at `1e81006`, first round, with a browser check in light and dark themes. Merged as `5f61fdd`. Notes: a mouse click on a tree row didn't select it under agent-browser (the same happens at 4dedb87, before F; keyboard selection works); the light-theme tint is faint (about L99 against L100).
- **Final integration check:** PASS at `601eb4a` (`main...fix/review-bugs`). Every acceptance criterion holds, and no shared-file reverts were found. The browser re-checked B1, H, B5, B6 and B9. It found that a mouse click on most of a layer-tree row doesn't select it. This was already broken on `main`, and the cause is the inner `<button onDoubleClick>` in `TreeItemContent` (`PaneLayerTree.tsx:128-132`).

---

## Execution with sub-agents

### Setup (orchestrator: the main session does this itself, no sub-agent)

1. `git switch -c fix/review-bugs`, then commit the current working tree as the baseline: the
   dependency bumps, `biome.json`, `StructureAble.tsx`, and the ancestor-tint `PaneLayerTree.tsx`.
   **Required:** agent worktrees are created from committed `HEAD`, so anything uncommitted would be
   missing from every sub-agent's copy. All commits are local only; nothing is pushed.
2. Write this plan to the repo root as `PLAN.md`. The agents reference `PLAN.md` by name. Commit it.
3. Create `.claude/agents/bug-fixer.md` and `.claude/agents/verifier.md` with the user's definitions verbatim:
   - `bug-fixer`: tools `Read, Grep, Glob, Edit, Write, Bash`, model `sonnet`. Fix exactly one bug:
     reproduce it with a failing test, make the minimal fix, run the full suite. Report files changed,
     the root cause in one sentence, and a summary of the test output. If it can't reproduce, stop and say so.
   - `verifier`: tools `Read, Grep, Glob, Bash`, model `sonnet`, read-only. It didn't write the fix.
     It checks the diff against the acceptance criterion, runs the tests, and looks for regressions in
     adjacent code. It returns PASS, FAIL, or CONCERNS with specifics.
   - Commit them. Check they appear as agent types; if the session needs a restart to load them, stop
     and ask the user to restart.
4. **The orchestrator builds T0 instead of `bug-fixer`.** It's infrastructure, not a bug, so the
   failing-test-first process doesn't apply. The orchestrator does it in a worktree and commits.
   **T0 still goes through the verifier gate below**, checked against the Step 0 acceptance. Whoever
   wrote it doesn't grade it, and that includes the orchestrator.

### Cross-check rule (applies to every task, T0 included)

Nothing is graded by the agent that wrote it. The only thing that unlocks a merge is a PASS from a
`verifier` that never saw the fix being written.

- **Fresh every time:** each verification is a brand-new `verifier` agent call. Never a fork, which
  would inherit the orchestrator's context, including the fixer's report. Never a SendMessage to an
  earlier verifier. A re-check after a retry uses another new one.
- **Blind input:** the verifier gets only
  - the `PLAN.md` entry name (it reads the acceptance criterion itself),
  - the worktree path and branch,
  - the diff command `git diff fix/review-bugs...<task-branch>`.

  It **doesn't** get the fixer's report, its root-cause claim, or its test summary.
- **It re-runs everything itself:**
  - the task's test command and the global gate;
  - each acceptance bullet in the entry, ticked off one by one with evidence;
  - adjacent-code regressions: callers of the changed functions, plus the other suites.

  The fixer's "tests pass" claim counts for nothing.
- **Read-only is enforced, not trusted:**
  - Before launching the verifier, the orchestrator records `git -C <worktree> rev-parse HEAD` and
    `git -C <worktree> status --porcelain`, and checks them again afterwards.
  - Any change voids the verdict: discard the changes and re-run with a fresh verifier.
- **Verdict format:** `PASS`, `FAIL`, or `CONCERNS: <list>`. Each item names the acceptance bullet or
  file:line it refers to.
- **The orchestrator can't overrule it:**
  - It can't downgrade CONCERNS to PASS or wave a concern off as out of scope. If it thinks a concern
    is out of scope, it asks the user.
  - It can't merge a task branch without a recorded PASS for that branch's **current HEAD**. Any
    commit after the PASS needs a new verification.

### Real-browser checks (approved by the user; added after B6)

Verifiers for UI tasks (B7, B8, F) and the final integration cross-check also check in a real browser
with the `agent-browser` CLI (vercel-labs, Apache-2.0, v0.41.2, installed globally with its own Chrome).
- The verifier starts `bunx vite --port <unique> --strictPort` from the task worktree in the
  background, and uses a dedicated session for every command: `agent-browser --session verify-<task> …`.
- It checks with `eval` (real `getComputedStyle` and layout), clicks, `console` and `errors`, and
  saves screenshots under `<scratchpad>/shots/`.
- It closes its session and kills only its own dev server afterwards.
- Read-only still applies; the before/after worktree check covers it.
- B6 and B9 merged before this existed. The final integration cross-check re-checks them in the
  browser: B6 inheritance via computed `font-family`/`color`; B9 drag, click, drill-down, marquee and
  the + buttons.

### Per-task loop (B1, B9, B5, H, B6, B7, B8, F)

1. **Fix:** the orchestrator creates the task's worktree itself with
   `git worktree add -b task/<id> <scratchpad>/wt-<id> fix/review-bugs` and runs `bun install` in it,
   so every dependency is already merged. Then it launches `bug-fixer` pointed at that path.
   (Correction: `isolation: "worktree"` branches from `main`, not from the current tip. Both wave-1
   fixers launched that way stopped before editing anything, because T0 was missing.) The prompt contains:
   - the task ID and its `PLAN.md` entry name (bugs 2+3+4 for `H`; the Feature spec for `F`, where
     "repro" means the current ancestor-tint behaviour failing criteria A–E);
   - the exact files from the task's row in the files table (it shouldn't edit outside them without
     reporting why);
   - the task's test command plus "then run `bun run test && bun run lint && bun run build`";
   - an instruction to commit in its worktree when done.
2. **Verify:** follow the cross-check rule above. Launch a fresh `verifier` with the blind input only.
3. **Act on the verdict:**
   - **PASS:** the orchestrator merges the task branch into `fix/review-bugs`, runs the global gate on
     the merged branch, checks the task's box in `PLAN.md`, and records the verdict there. This
     unblocks dependents.
     If the gate fails on the merged branch (an integration break), revert the merge and send the
     gate output to the fixer as a FAIL.
   - **FAIL or CONCERNS:** send the verifier's list back to the **same** `bug-fixer` (SendMessage, with
     its context intact). The fixer addresses each item and commits, then a **new** `verifier`
     re-checks the new HEAD from scratch. Allow at most 2 retry rounds. After that, or if `bug-fixer`
     reports it can't reproduce, mark the task blocked and ask the user. Its dependents stay blocked;
     unrelated tasks keep going.

### Scheduling

- Start a task as soon as all of its blockers are merged. Don't wait for the whole wave.
- At most 2 `bug-fixer`s run at once (the widest wave). Verifiers run as each fix lands.
- Parallel fixers never share files (see the files table), so merges into `fix/review-bugs` are
  conflict-free by construction. If a merge does conflict, stop and report it; don't hand-resolve
  agent work silently.
- **H coalescing policy:** `bug-fixer` implements `getCoalesceKey` using the suggested keys.
  Afterwards, flag it to the user for review, since it decides what counts as one undo step.
- Manual checks (B9, Feature F, and the final Verification section) can't be done by sub-agents. The
  orchestrator starts `bun run dev` and hands the user the checklist at the end.

### Final integration cross-check

After F merges, launch one more fresh `verifier` on `fix/review-bugs`, with the diff command
`git diff main...fix/review-bugs`. It re-checks **every** acceptance criterion in `PLAN.md` (T0, all
9 bugs, Feature A–E), because a later task can quietly undo an earlier fix in the same file. That
applies to the shared files `useDesigner.ts`, `BreakpointFrame.tsx`, `text.tsx` and
`DesignerCanvas.tsx`. Its verdict follows the same rules. A FAIL on any criterion reopens that task.

### End of run

The orchestrator reports:
- each task's verdict, its root cause in one sentence, and its retry count;
- any blocked tasks;
- the global gate output on `fix/review-bugs`;
- the manual checklist.

It doesn't push or open a PR unless asked.

---

## Step 0 — Test infrastructure (required before any bug)

There is no test runner today. Add Vitest, since it shares the Vite config and is conventional for OSS Vite projects.
- `bun add -d vitest jsdom @testing-library/react @testing-library/dom`
- `vite.config.ts`: add `test: { environment: "jsdom" }` (with `/// <reference types="vitest" />`)
- `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`
- Export `reducer` and `initialState` from `src/hooks/useDesigner.ts` so they can be unit-tested.
- Shared fixture `src/test/fixtures.tsx` (`.tsx` because it contains JSX): `makeLayer(id, children?)`, the 3 breakpoints from `App.tsx`,
  and a `renderInDesigner(ui, { layers, breakpoints })` helper wrapping `DesignerProvider` with the
  default layer types from `Designer.tsx`.

**Acceptance:** `bun run test` runs and exits 0 with a placeholder test. `bun run lint` and `bun run build` still pass.

**Global gate after every entry:** `bun run test && bun run lint && bun run build`

Existing helpers to reuse (don't rewrite):
`findLayer`, `updateLayerById`, `deleteLayer` (`src/hooks/useDesigner.ts`);
`findLayerById`, `isDescendantOf` (`src/components/PaneLayerTree.tsx`);
`getEffectiveStyles`, `sortBreakpointsByWidth` (`src/lib/breakpointUtils.ts`);
`applyCssVars` (`src/lib/cssPropertyMapping.ts`).

---

## Bug 1 — "Add inside" duplicates the new layer into other frames

**Repro:** Layers `A[a1]`, `B[b1]`. Dispatch `ADD_LAYER { layer: NEW, targetLayerId: "A", position: "inside" }`.
The resulting IDs are `A,a1,NEW,B,b1,NEW`. NEW appears twice, which also causes React key collisions.
`MOVE_LAYER` with `position: "on"` goes through the same path.

**Suspected files:** `src/hooks/useDesigner.ts`, in `insertLayer` (the `"inside"` branch recurses
into every child list, and its not-found fallback appends `newLayer` to each).

**Fix:** For `"inside"`, replace the hand-rolled recursion with
`updateLayerById(layers, targetLayerId, l => ({ ...l, children: [...(l.children ?? []), newLayer] }))`.
Keep the append-to-root fallback only at the top-level call.

**Acceptance:**
- After ADD inside A, the IDs are exactly `A,a1,NEW,B,b1`.
- Adding inside a frame nested two levels deep inserts only there.
- MOVE_LAYER `"on"` into A leaves exactly one copy of the moved layer.

**Test:** `bunx vitest run src/hooks/useDesigner.test.ts -t "insertLayer"`

---

## Bug 2 — Redo never restores; `canUndo` is off by one

**Repro:** Layer X. Rename it to "renamed", then UNDO, then REDO. The name stays "X" (expected "renamed").
Also, after a single edit, `useHistory().canUndo` is `false` (`historyIndex > 0`), but UNDO does work.

**Suspected files:** `src/hooks/useDesigner.ts` (`addHistoryEntry`, `handleUndo`, `handleRedo`),
`src/hooks/useHistory.ts`.

**Fix (shared with bugs 3 and 4):** Replace `history: State[]` + `historyIndex` with
`history: { past: Doc[]; future: Doc[] }`, where `type Doc = { layers; breakpoints; frameStyles }`.
- Committing an edit pushes the current Doc to `past` and clears `future`.
- UNDO pops from `past` and pushes the current Doc to `future`.
- REDO does the reverse.
- `canUndo = past.length > 0`, `canRedo = future.length > 0`.

**Acceptance:**
- Rename → UNDO → REDO gives "renamed".
- Edit A → edit B → UNDO → UNDO → REDO → REDO returns to the post-B document.
- A new edit after an undo clears redo.
- `canUndo` is true after one edit.

**Test:** `bunx vitest run src/hooks/useDesigner.test.ts -t "undo redo"`

---

## Bug 3 — Undo also reverts zoom, pan, selection and dialog state

**Repro:** Rename X, then `SET_ZOOM 3`, then UNDO. Zoom goes back to 1 (expected 3), because history stores the whole `State`.

**Suspected files:** `src/hooks/useDesigner.ts` (same as bug 2).

**Fix:** Covered by the Doc-only history from bug 2. UNDO/REDO replace only `layers`, `breakpoints`
and `frameStyles`. After restoring, prune `selectedLayers` to IDs that still exist, and reset
`selectedBreakpointId` / `activeBreakpointId` if their breakpoint no longer exists.

**Acceptance:**
- Zoom, pan, `addLayerDialog` and `centerRequestId` are unchanged by UNDO/REDO.
- Undoing an ADD of a selected layer leaves `selectedLayers` without that ID.

**Test:** `bunx vitest run src/hooks/useDesigner.test.ts -t "history scope"`

---

## Bug 4 — History memory is O(n²); every keystroke or slider tick adds an entry; multi-delete adds N entries

**Repro:**
- 1,000 renames allocate 500,500 history-array slots, because each snapshot carries its own copied `history`.
- Typing "hello" into a layer name or text content creates 5 undo steps.
- Deleting 3 selected layers with Backspace creates 3 undo steps (`DesignerCanvas.tsx` loops `DELETE_LAYER`).

**Suspected files:** `src/hooks/useDesigner.ts`, `src/components/DesignerCanvas.tsx` (`handleDelete`),
plus the dispatchers in `PaneLayerTree.tsx` (rename), `actions/ActionTextContent.tsx`,
`actions/ColorActionPopover.tsx`, `actions/SliderActionControl.tsx` and
`actions/NumericActionControl.tsx` (via `useBreakpointCss.setValue`).

**Fix:**
- Doc snapshots (bug 2) share structure and hold no nested history, so memory grows linearly.
- Cap `past` at 200 entries.
- Coalescing: add a pure `getCoalesceKey(action): string | null` in `useDesigner.ts`. If the incoming
  action's key equals the key of the last committed action, replace the top of the stack instead of
  pushing. Any action with a different key, or a null key, breaks the run.
  Suggested keys: `name:<id>`, `value:<id>`, `css:<id>:<bp>:<sorted props>`, `frame:<sorted props>`.
  `bug-fixer` implements these keys. The orchestrator then flags `getCoalesceKey` for user review: it
  decides what counts as "one undo step", and two separate drags of the same slider in a row merge
  into one step.
- Replace `DELETE_LAYER { layerId }` with `DELETE_LAYERS { layerIds: string[] }` (one history entry),
  and update `DesignerCanvas.tsx`.

**Acceptance:**
- After 1,000 renames of one layer, `past.length` is ≤ 200 and no Doc contains a history field.
- 5 consecutive `UPDATE_LAYER_NAME` dispatches for the same layer make 1 undo step; one UNDO restores the original name.
- 5 consecutive `UPDATE_LAYER_CSS` dispatches for the same prop make 1 step; a change to a different prop starts a new step.
- Deleting 3 layers makes 1 step; one UNDO restores all 3 in their original order.

**Test:** `bunx vitest run src/hooks/useDesigner.test.ts -t "history memory|coalesce|delete"`

---

## Bug 5 — Breakpoint overrides never render on the canvas

**Repro:** Text layer with base `--font-size: 16px` and `breakpointCssVars.tablet["--font-size"] = "24px"`.
The tablet frame renders at 16px. The panel shows 24px, so the panel and the canvas disagree.

**Suspected files:**
- `src/components/BreakpointFrame.tsx`: computes `effectiveCssVars` into `contentStyle`, which nothing reads.
- `src/lib/layers/{frame,text,image,input}.tsx`: all call `applyCssVars(layer.cssVars, …)` (base only).
- `src/lib/Types.ts`: `LayerWithStyles`.
- `src/components/DesignerCanvas.tsx`: `selectedLayersCSSVars` only watches base `cssVars`, so the Moveable rect goes stale on overrides.

**Fix:**
- Replace `contentStyle: CSSProperties` with `effectiveCssVars: CSSVars` on `LayerWithStyles`.
- Change every renderer to `applyCssVars(layer.effectiveCssVars, <type>.supportedCssProperties)`.
- Include `breakpointCssVars` and `activeBreakpointId` in the Moveable `updateRect` dependency.

**Acceptance:**
- The mobile frame renders 16px and the tablet frame renders 24px.
- The desktop frame (no override) inherits 24px from tablet.
- Clearing the tablet override brings tablet back to 16px.
- All four layer types honour overrides; image `--width` is a good second case.

**Test:** `bunx vitest run src/components/BreakpointFrame.test.tsx -t "breakpoint overrides"`

---

## Bug 6 — Frame-level typography and colour do nothing

**Repro:** In the frame styles panel, set `--font-family: Georgia` and `--color: #f00`. Text layers don't
change. The values are spread onto the frame as CSS custom properties, which no layer ever reads with
`var()`. Only `--background-color` is special-cased.

**Suspected files:** `src/components/BreakpointFrame.tsx` (the `...frameStyleVars` spread),
`src/components/FrameStylesPanel.tsx` (sets `--font-family`, `--font-size`, `--line-height`,
`--color`, `--background-color`), `src/lib/layers/text.tsx` (`defaultValues` hard-codes
`--font-family: Arial`, which always shadows the frame font).

**Fix:**
- Apply `applyCssVars(state.frameStyles)` as real properties on the frame content root, so inheritable
  properties cascade natively.
- Keep the `#ffffff` background fallback.
- Remove `--font-family` from the text layer's `defaultValues` so new text inherits the frame font.

**Acceptance:**
- A text layer with no explicit `--font-family` or `--color` renders with the frame's values in every breakpoint.
- A layer with an explicit value keeps its own.
- A newly added text layer inherits the frame font.

**Test:** `bunx vitest run src/components/BreakpointFrame.test.tsx -t "frame styles"`

---

## Bug 7 — The frame content root is a `<button>` wrapping the design

**Repro:** Inspect `.breakpoint-content`: it's a `<button>` containing `<div>`, `<p>` and `<input>`
layers. That's invalid HTML (React logs `validateDOMNesting`), and the button's browser defaults leak
into the design, so the canvas differs from exported HTML.

**Suspected files:** `src/components/BreakpointFrame.tsx`.

**Fix:**
- Replace it with `<div className="breakpoint-content relative" data-slot="designer-frame">` and keep
  `handleContentClick`.
- Add a biome-ignore with a reason for `useKeyWithClickEvents`: keyboard users can already select a
  breakpoint from its section header in the layer tree.
- Out of scope: Tailwind preflight also resets `h1` and `p` styles inside designs. Note it under
  Follow-ups (iframe isolation), not here.

**Acceptance:**
- `.breakpoint-content` is a `div`.
- Rendering a frame with an input layer logs no `validateDOMNesting` error (spy on `console.error`).
- Clicking empty frame space still dispatches `SELECT_BREAKPOINT`; clicking a layer does not.

**Test:** `bunx vitest run src/components/BreakpointFrame.test.tsx -t "frame root"`

---

## Bug 8 — Text layers accept children, which produces invalid nesting

**Repro:** Drag a frame onto a text layer in the tree. It's accepted (`text.supportsChildren: true`),
so a `<div>` renders inside a `<p>`, and the canvas "+ inside" control is offered on text.

**Suspected files:** `src/lib/layers/text.tsx`, `src/hooks/useDesigner.ts` (`insertLayer` has no
guard), `src/components/PaneLayerTree.tsx` (`shouldAcceptItemDrop`; already correct once the flag is
false), `src/components/ables/StructureAble.tsx` (reads `supportsChildren`).

**Fix:**
- Set `supportsChildren: false` on the text layer type.
- Add a reducer guard: `ADD_LAYER` or `MOVE_LAYER` with position `inside`/`on` targeting a layer whose
  type doesn't support children is a no-op, with no history entry. Look the type up in `state.layerTypes`.

**Acceptance:**
- Reducer: ADD inside a text layer leaves the state unchanged by reference, and `past` doesn't grow.
- Tree: `shouldAcceptItemDrop` is false for text targets.
- Canvas: the "inside" button isn't shown for a selected text layer.

**Test:** `bunx vitest run src/hooks/useDesigner.test.ts -t "supportsChildren"`

---

## Bug 9 — Canvas drag moves layers visually but never saves (decision: disable)

**Repro:** Select a layer on the canvas and drag it. It moves, because `onDrag` writes `style.transform`
to the DOM directly. Nothing reaches state, so the move isn't in undo, the CSS panel or exports, and it
can vanish on re-render.

**Suspected files:** `src/components/DesignerCanvas.tsx` (the `<Moveable draggable throttleDrag onDrag>` props).

**Fix:** Set `draggable={false}` and remove `onDrag`, `throttleDrag`, `startDragRotate` and
`throttleDragRotate`. Keep Moveable for the selection outline and the custom ables. Reordering stays
in the layer tree.

**Acceptance:**
- Moveable receives `draggable: false` and no `onDrag` (assert with `vi.mock("react-moveable")` capturing props).
- Manually: dragging a selected layer doesn't move it; click selection, drill-down clicks, marquee
  select and the +before/inside/after buttons still work.

**Test:** `bunx vitest run src/components/DesignerCanvas.test.tsx -t "drag disabled"`, plus the manual check in `bun run dev`.

---

## Feature spec — Layer tree: Figma-style selection subtree tint

**Goal:** In the layer menu, selecting a layer highlights it strongly and gives every row it contains
a lighter background, so it's obvious what the selection includes.

**Behaviour:**
1. The selected row keeps `bg-accent text-accent-foreground`.
2. Every **descendant** row of a selected layer (children, grandchildren, and so on) gets the lighter
   tint `bg-accent/30`. Ancestors are **not** tinted, which replaces the earlier ancestor-tint version.
3. Multi-select tints the union of the selected layers' descendants. A row that is both selected and
   inside another selection shows as selected.
4. Visual priority: drop target > selected > hover > subtree tint > none.
5. With breakpoint sections, the tint appears only in the active breakpoint's tree, which matches
   where selection is shown.
6. Selecting a leaf, or a frame with no children, tints nothing extra.
7. Collapsed descendants aren't rendered. Expanding a selected frame shows its children already tinted.
8. The tint updates immediately when the selection changes, with no stale rows from React Aria's item
   cache. Keep the `dependencies` prop on `Tree` and `Collection`.
9. The tint is legible in both light and dark themes.

**Files:** `src/components/PaneLayerTree.tsx`
- Replace `getAncestorIds` with `getDescendantIds(layers, selectedIds)`, reusing `findLayerById` and
  then walking `children`.
- Rename `selectedAncestorIds`/`ancestorDependency` to `selectedSubtreeIds`/`subtreeDependency`.
- Expose `data-in-selection="true"` on tinted `TreeItem`s for tests. If React Aria doesn't forward
  `data-*`, assert on the class instead.

**Acceptance criteria:**
- A: Layers `Frame[Child[Grandchild]]`, `Other`. Select Frame: Child and Grandchild are tinted; Frame
  is selected, not tinted; Other is untouched.
- B: Select Child: Grandchild is tinted; Frame is **not** tinted.
- C: Select Grandchild (a leaf): no row is tinted.
- D: Select Frame, then select Other: no stale tint on Child or Grandchild.
- E: With mobile/tablet/desktop sections, the tint shows only in the active section.
- F: Manually, in `bun run dev`, in light and dark themes: click "Frame 1" in the sample data and its
  child "Text" row is visibly tinted; hover over a tinted row still shows the hover colour.

**Test:** `bunx vitest run src/components/PaneLayerTree.test.tsx`, plus the manual check F.

---

## Round 2: remaining bugs (requested by the user after round 1)

Same process as round 1: one `bug-fixer` per task in an orchestrator-made worktree, a fresh blind
`verifier` with real-browser checks, merge only on PASS, and a final integration check at the end.
At most 2 fixers run at once. Not in scope: lint warnings (including the `applyAction` complexity
warning), which aren't bugs, and the architecture follow-ups (iframe rendering, which fully fixes the
Tailwind preflight leak, plus the flat node map and so on).

**Rule added mid-round:** no agent may use `git stash`. The stash stack is shared by every worktree in
the repo: R2's fixer popped another worktree's stash, and it was caught before anything was committed.
To test against old code, use a scratch copy.

### Round 2 tasks and dependencies

| Task | Edits (under `src/`) | Tests | Blocked by |
|---|---|---|---|
| **R1** Row click | `components/PaneLayerTree.tsx`; may add `@testing-library/user-event` to `package.json`/`bun.lock` | `components/PaneLayerTree.test.tsx` | — |
| **R2** Section-header nested button | `components/PaneLayerTree.tsx` | `components/PaneLayerTree.test.tsx` | R1 (same file) |
| **R3** Tree drag-handle warning | `components/PaneLayerTree.tsx` | `components/PaneLayerTree.test.tsx` | R2 (same file) |
| **R4** Frame-header nested button | `components/BreakpointHeader.tsx` | new `components/BreakpointHeader.test.tsx` | — |
| **R5** Editor colour leaks into design | `components/BreakpointFrame.tsx`, `lib/layers/text.tsx` (defaults) | `components/BreakpointFrame.test.tsx` | — |
| **R6** Font control shows "Arial" for inherited font | `components/actions/ActionFontFamily.tsx`, `components/FontLoader.tsx` (amended) | new `components/actions/ActionFontFamily.test.tsx` | — |
| **R7** Dead canvas selector | `components/DesignerCanvas.tsx` | `components/DesignerCanvas.test.tsx` | — |

Order: R1 ∥ R4, then R2, R5, R6 and R7 as slots free up (R2 only after R1 merges), then R3, then a
final integration check.

- [x] R1 · [x] R2 · [ ] R3 · [x] R4 · [x] R5 · [ ] R6 · [~] R7 (dropped)

**Round 2 verdict log:**
- R1: PASS at `8465ffc`, first round. In a real browser, clicks right of the name, in the padding, on the name and on the icon all select. Merged as `dd0a48c`. Shift-click wasn't compared with the base branch (the tree is single-select and the selection code is unchanged).
- R5: PASS at `08acde1`, first round. In a real browser, in dark and light themes: plain text is `rgb(0,0,0)`, a new text layer follows the frame red, and explicit colours are kept. Merged as `bd12d9c`. Note: the `App.tsx` sample text layers still set an explicit `--color` (sample data). Port 5222 was double-assigned; from now on, ports are unique per verifier run.
- R2: PASS at `4622b2f`, first round, with a browser and keyboard check; visuals match the base. Merged as `bc6ec0a`. Note: the header's 8px edge padding no longer selects on click.
- R4: PASS at `7ea81ef` after 2 retry rounds (CONCERNS: keyboard select lost, then the header became full width). In a real browser it matches the base visuals with 0 px difference and the same keyboard tab stops. New: drag by the name area works and doesn't select. Fixes the base bug where Enter on the header added a breakpoint. Merged as `397b29a`. Note: after a mouse click on the name, focus no longer lands on the select button.

---

## R1 — Clicking most of a layer-tree row doesn't select it

**Repro:** In the layer tree, click a row to the right of its name, or in the padding between icon and
name. Nothing is selected. Only clicks landing exactly on the name `<span>`, the icon or the spacer
select. `elementFromPoint` at those dead spots returns the inner `<button type="button"
onDoubleClick>`, which swallows React Aria's press on the row. This was already broken on `main` (final
integration check). The verifier confirmed that changing that `<button>` to a non-interactive element
makes every click select.

**Suspected files:** `src/components/PaneLayerTree.tsx` (`LayerTreeItemContent`, the "Layer icon
and name" `<button>`, around lines 128–132).

**Fix:** Make the icon and name wrapper non-interactive (`<div>` or `<span>`), and keep
`onDoubleClick` for inline rename. Don't nest interactive elements inside the row except the
chevron (`slot="chevron"`) and lock buttons.

**Acceptance:**
- In a real browser, a mouse click anywhere on a row's name area (on the name, right of it, or in
  the padding) selects that layer in the active breakpoint section.
- Double-clicking the name still opens inline rename, and Enter or Escape closes it.
- The chevron still expands and collapses, and the lock button still toggles the lock without selecting.
- Shift-click behaviour is unchanged from before.
- jsdom: a pointer click (via `@testing-library/user-event`) on the row's name wrapper outside the
  name text selects the layer. This test fails on the old code.

**Test:** `bunx vitest run src/components/PaneLayerTree.test.tsx -t "row click"`, plus the browser check.

---

## R2 — Breakpoint section header nests a `<button>` inside a `<button>`

**Repro:** The console logs `validateDOMNesting: <button> cannot appear as a descendant of <button>`
from `BreakpointSectionHeader` in `PaneLayerTree.tsx` (around line 202): the chevron toggle
`<button>` is inside the header `<button>`. That's invalid HTML, and the two click targets overlap.

**Suspected files:** `src/components/PaneLayerTree.tsx` (`BreakpointSectionHeader`).

**Fix:** Make the chevron toggle and the header-select button siblings inside a non-interactive
wrapper. Keep the visuals: same row, active background and hover state.

**Acceptance:**
- No `<button>` inside a `<button>` in the section header. A jsdom render logs no `validateDOMNesting`
  error, and the structural assertion `header.querySelector("button button")` is `null`.
- Clicking the header selects the breakpoint (`SELECT_BREAKPOINT`).
- Clicking the chevron toggles expand and collapse without selecting.
- The browser console no longer shows this warning.

**Test:** `bunx vitest run src/components/PaneLayerTree.test.tsx -t "section header"`, plus the browser check.

---

## R3 — React Aria warns that draggable tree items have no drag handle

**Repro:** For every row, the console logs `Draggable items in a Tree must contain a <Button
slot="drag">`. The tree uses `useDragAndDrop`, but `TreeItemContent` has no drag-slot button, so
keyboard and screen-reader users can't start a drag.

**Suspected files:** `src/components/PaneLayerTree.tsx` (`LayerTreeItemContent`).

**Fix:** Add a React Aria `<Button slot="drag">` with a grip icon (for example `IconGripVertical`) to
each row. Show it on row hover or focus, so the row looks the same at rest, and give it an
`aria-label`. Mouse drag on the row keeps working.

**Acceptance:**
- Rendering the tree logs no "must contain a <Button slot=\"drag\">" warning (jsdom spy).
- Every row has exactly one `[slot="drag"]` button with an accessible name.
- In a real browser, mouse drag of a row onto a frame still nests it (as in the B8 check), and row
  click selection from R1 still works.

**Test:** `bunx vitest run src/components/PaneLayerTree.test.tsx -t "drag handle"`, plus the browser check.

---

## R4 — Breakpoint frame header nests a `<button>` inside a `<button>`

**Repro:** In jsdom test output and the browser console, `validateDOMNesting` reports a `<button>`
inside a `<button>` from `BreakpointHeader` (`src/components/BreakpointHeader.tsx`, the outer
`<button>` around line 142 contains another around line 178).

**Suspected files:** `src/components/BreakpointHeader.tsx`.

**Fix:** Restructure so the two click targets are siblings in a non-interactive wrapper. Keep the
header's existing select, drag-start (the `closest("button")` guard around line 52) and inner-button
behaviours, and keep the visuals.

**Acceptance:**
- `querySelector("button button")` inside the header is `null`, and no `validateDOMNesting` error is
  logged on render.
- Clicking the header still selects its breakpoint, and the inner button still does its action
  without triggering the header's.
- Dragging the header to move the frame works as before, in the browser.

**Test:** `bunx vitest run src/components/BreakpointHeader.test.tsx`, plus the browser check.

---

## R5 — Editor text colour leaks into the design; new text ignores the frame colour

**Repro:**
- In a real browser, the frame root's computed `color` is `lab(98 0 0)`, which is the editor's
  dark-theme foreground. A text layer with no `--color` of its own renders white on white.
- Separately, the text layer default `--color: #000000` shadows the frame colour, so setting a frame
  colour never reaches newly added text (B6 verifier note).

**Suspected files:** `src/components/BreakpointFrame.tsx` (the root `style`), `src/lib/layers/text.tsx`
(`defaultValues`).

**Fix:**
- Give the frame root a default `color` of `#000000` when `frameStyles` has no `--color`, mirroring
  the existing `#ffffff` background fallback, so the design never inherits editor colours.
- Remove `--color` from the text layer's `defaultValues`.
- Out of scope: Tailwind preflight resets (`h1` and `p` margins) inside designs. Those belong to the
  iframe follow-up.

**Acceptance:**
- With no frame colour, a text layer with no `--color` computes `rgb(0, 0, 0)` in every frame, in
  both light and dark editor themes (real browser).
- With frame `--color: #ff0000`, a newly added text layer computes `rgb(255, 0, 0)`, and a layer
  with an explicit colour keeps it.
- jsdom: the root carries `color: #000000` (or the frame colour), and `textLayerType.defaultValues`
  has no `--color`. The B5, B6 and B7 tests still pass.

**Test:** `bunx vitest run src/components/BreakpointFrame.test.tsx -t "default colour"`, plus the browser check.

---

## R6 — Font control shows "Arial" for text that inherits the frame font

**Repro:** Set the frame font to Georgia and select a text layer with no `--font-family`. The
Typography font control shows "Arial", but the text renders in Georgia.
`ActionFontFamily.tsx` uses `selectedLayer?.cssVars?.["--font-family"] || "Arial"`.

**Suspected files:** `src/components/actions/ActionFontFamily.tsx`.

**Fix:** When the layer has no font of its own, show the font it actually inherits: the frame's
`--font-family` from `state.frameStyles`, marked as inherited (for example, muted or placeholder
styling like the other inherited-value controls). If no frame font is set, show a neutral "Default"
label instead of "Arial". Selecting a font still sets the layer's own `--font-family`.

**Acceptance:**
- A layer with no font plus frame Georgia shows "Georgia", visibly marked as inherited.
- A layer with no font and no frame font shows "Default", not "Arial".
- A layer with an explicit font shows that font, unmarked.
- Choosing a font still dispatches `UPDATE_LAYER_CSS` with `--font-family`.

**Test:** `bunx vitest run src/components/actions/ActionFontFamily.test.tsx`, plus a browser check of the panel.

**Amendment (approved by the user after the R6 verifier's CONCERNS):**
- The font control is **breakpoint-aware**, like the other style controls: choosing a font while a
  non-primary breakpoint is active writes a breakpoint override for that breakpoint and larger ones,
  not the base font.
- R6's scope extends to `src/components/FontLoader.tsx`. It must load every font a layer can render
  with: base `cssVars`, every `breakpointCssVars[*]["--font-family"]`, and the frame's
  `frameStyles["--font-family"]`.
- Extra acceptance:
  - A font chosen on Tablet is stored in `breakpointCssVars.tablet` and renders in Tablet and
    Desktop but not Mobile.
  - `FontLoader` requests fonts set as a breakpoint override and as the frame font, in documents
    supplied as initial layers, with no user selection.
  - The select test asserts the `UPDATE_LAYER_CSS` payload, including `breakpointId` when a
    non-primary breakpoint is active.

---

## R7 — Canvas Selecto target `.designer-frame .designer-layer` never matches

> **Dropped: the premise was wrong.** The R7 fixer stopped before editing, as instructed:
> `DesignerFrame.tsx:24` *does* render `className="designer-frame"`, and `useLayerDimensions.ts:19`
> queries it. Every `.designer-layer` renders inside `.breakpoint-content`, which is inside
> `.designer-frame`, so the two Selecto targets match the same elements. The second one is redundant,
> not dead, and causes no user-facing problem. The orchestrator relayed the round-1 claim without
> checking it.

**Repro:** `DesignerCanvas.tsx` (around line 524) passes `".designer-frame .designer-layer"` to
Selecto's `selectableTargets`, but no element has the class `designer-frame` (only
`data-slot="designer-frame"`), so the selector is dead. The live target is
`.breakpoint-content .designer-layer`.

**Suspected files:** `src/components/DesignerCanvas.tsx`.

**Fix:** Remove the dead selector. Leave the live one.

**Acceptance:**
- `selectableTargets` is exactly `[".breakpoint-content .designer-layer"]` (assert via the existing
  `react-selecto` mock in `DesignerCanvas.test.tsx`).
- Canvas click selection, drill-down and marquee behave as before (browser).

**Test:** `bunx vitest run src/components/DesignerCanvas.test.tsx -t "selectable targets"`, plus the browser check.

---

## Verification (end to end)

1. `bun run test`: all suites green (`useDesigner.test.ts`, `BreakpointFrame.test.tsx`,
   `DesignerCanvas.test.tsx`, `PaneLayerTree.test.tsx`).
2. `bun run lint` (0 errors) and `bun run build` (succeeds).
3. `bun run dev` → http://localhost:5173 manual pass:
   - Add inside Frame 1 (one copy).
   - Undo, redo, and confirm zoom is untouched.
   - Type in the text content box and confirm one undo step.
   - Set a tablet font-size override and confirm only tablet and desktop change.
   - Set the frame font and confirm text inherits it.
   - Drag a layer and confirm nothing moves.
   - Check the subtree tint (feature F).

## Follow-ups (not in this plan)

- Flat node map with per-node subscriptions.
- Stop writing `SET_PAN` on every scroll.
- Make `useDesignerAction` stable.
- Iframe and generated-stylesheet rendering, which also fixes the Tailwind preflight leak.
  The browser smoke test showed the editor's dark-theme text colour (`lab(98 0 0)`) is inherited by design
  content, so a text layer with no colour of its own renders white on white. Also, the text default
  `--color: #000000` shadows the frame colour (B6 verifier note).
- Existing nested `<button>` warnings: `PaneLayerTree.tsx:256` (`BreakpointSectionHeader`) and
  `BreakpointHeader.tsx:14`; React Aria warns that draggable tree items have no `slot="drag"` button.
- ~~`DesignerCanvas.tsx:526` selector never matches~~ (wrong: it's redundant, not dead; see R7).
- Layer-tree row click (above). Also, the Typography panel shows "Arial" for text that inherits the frame font
  (`ActionFontFamily.tsx` fallback).
- Headless core package, `applyOps`, MCP server.
- React 19 / Vite 7 upgrade; bundle split; README refresh.
