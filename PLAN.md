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

- [x] R1 · [x] R2 · [x] R3 · [x] R4 · [x] R5 · [x] R6 · [~] R7 (dropped)

**Round 2 verdict log:**
- R1: PASS at `8465ffc`, first round. In a real browser, clicks right of the name, in the padding, on the name and on the icon all select. Merged as `dd0a48c`. Shift-click wasn't compared with the base branch (the tree is single-select and the selection code is unchanged).
- R5: PASS at `08acde1`, first round. In a real browser, in dark and light themes: plain text is `rgb(0,0,0)`, a new text layer follows the frame red, and explicit colours are kept. Merged as `bd12d9c`. Note: the `App.tsx` sample text layers still set an explicit `--color` (sample data). Port 5222 was double-assigned; from now on, ports are unique per verifier run.
- R2: PASS at `4622b2f`, first round, with a browser and keyboard check; visuals match the base. Merged as `bc6ec0a`. Note: the header's 8px edge padding no longer selects on click.
- R4: PASS at `7ea81ef` after 2 retry rounds (CONCERNS: keyboard select lost, then the header became full width). In a real browser it matches the base visuals with 0 px difference and the same keyboard tab stops. New: drag by the name area works and doesn't select. Fixes the base bug where Enter on the header added a breakpoint. Merged as `397b29a`. Note: after a mouse click on the name, focus no longer lands on the select button.
- R6: PASS at `882dc52` after 2 retry rounds (CONCERNS: a `FontLoader` gap from going breakpoint-aware, so the scope was amended and the user approved; then breakpoint-inherited fonts showed as explicit). All font-control states were checked in a real browser. Merged as `5babb86`.
- R3: PASS at `9710e69` after 1 retry round (CONCERNS: the reserved handle space shifted rows 20px and misaligned rename, so the handle is now overlaid). In a real browser all 12 rows match the base at rest, the drag-handle warning count went from 24 to 0, and mouse drag, keyboard drag and row clicks all work. Merged as `e67901f`.
- **Round 2 final integration check:** PASS at `93999dc`. Every R1–R6 criterion, including the R6 amendment, holds, and Round 1 spot-checks (F, B6, B7, B8) show no regressions. The console has no `validateDOMNesting` and no drag-slot warnings.

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

## Round 3: open items, new bugs, re-render architecture, style isolation

### Context

Rounds 1 and 2 are merged on `fix/review-bugs`: 76 tests pass, lint has 0 errors and 6 warnings,
and there's a full history in the repo's `PLAN.md`. This round covers:
- the items left open after round 2: frame-font loading on every keystroke, the stale selection
  outline after a frame drag, Selecto selecting on drag release, the faint light-theme tint, and the
  lint warnings;
- a bug found while planning: one frame drag creates one undo step per mousemove;
- four bugs exploration found, which the user approved adding: layout controls that do nothing,
  broken zoom handling around the selection box, a wrong size readout, and leftover styles after
  deleting a breakpoint;
- the two architecture items, implemented in stages: re-render performance up to a flat node map,
  and isolating design content from the editor's CSS.

**Decisions made by the user**
- **Architecture:** implement both, in stages.
- **Isolation:** use a **shadow root**, not an iframe. Exploration found that Moveable 0.56 can't
  position its box across an iframe boundary, and Selecto, pan/zoom and the keyboard shortcuts all
  lose events inside iframes. Per-frame `@media` through an iframe becomes a later item, tied to
  HTML export.
- **Light theme:** make the selected row stronger. In the light theme, selected uses a darker
  neutral, and the tint uses today's accent colour.

### Process (same as Rounds 1–2, including every rule they added)

- **Worktrees:** the orchestrator creates each worktree from the current `fix/review-bugs` tip
  (`git worktree add -b task/<id> <scratchpad>/wt-<id>`, then `bun install`).
- **Fix:** a `bug-fixer` writes a failing test first, then makes the minimal fix, then runs the
  gate (`bun run test && bun run lint && bun run build`), then commits.
- **Verify:** a **fresh, blind** `verifier` gets only the entry name, the worktree path and the
  diff command. For UI tasks it also runs real-browser checks with agent-browser. It confirms the
  new tests fail on the old code, using a scratch copy.
- **Read-only check:** the orchestrator records the worktree's `HEAD` and status before and after
  each verifier run.
- **Merge:** only on PASS for the current `HEAD`, then the gate runs on the merged branch.
  CONCERNS or FAIL goes back to the same fixer, with at most 2 retries; after that the task is
  blocked and goes to the user.
- **Rules added during Round 2:**
  - Nobody uses `git stash`; old-code checks use scratch copies.
  - Every verifier gets its own port, `53NN`, where NN is the task number in the table below; base
    comparisons use `53NN+50`.
  - Each agent kills only its own servers.
  - At most 2 fixers run at once.
  - Plan deviations go to the user.
- **Final step:** a fresh verifier runs a **Round 3 integration check**, re-running every test
  command from all rounds and doing browser spot-checks of earlier criteria.

Existing pieces to reuse:
- `getCoalesceKey`, `addHistoryEntry`, `restoreDoc`, `updateLayerById` (`src/hooks/useDesigner.ts`)
- `applyCssVars`, `CSS_VAR_TO_PROPERTY_MAP` (`src/lib/cssPropertyMapping.ts`)
- `getEffectiveStyles`, `sortBreakpointsByWidth`, `isPrimaryBreakpoint` (`src/lib/breakpointUtils.ts`)
- `useGoogleFonts.loadFont` and its `loadedFonts` dedupe (`src/hooks/useGoogleFonts.ts`)
- the fixtures in `src/test/fixtures.tsx`; `@testing-library/user-event`
- React 18's built-in `useSyncExternalStore`; no new state library

### Tasks, files and dependencies

Paths are under `src/`. "→" means "blocked by".

| # | Task | Edits | New/extended tests | Blocked by |
|---|---|---|---|---|
| 01 | **S1** Frame-font loading on every keystroke; comma lists | `hooks/useGoogleFonts.ts`, `components/FontLoader.tsx`, new `lib/fontFamily.ts` | `lib/fontFamily.test.ts`, `FontLoader.test.tsx` | — |
| 02 | **S2** A frame drag creates N undo steps | `hooks/useDesigner.ts` (`getCoalesceKey`) | `useDesigner.test.ts` | — |
| 03 | **S3** Selection outline stale after a frame moves | `components/DesignerCanvas.tsx` | `DesignerCanvas.test.tsx` | — |
| 04 | **S4** Releasing a header drag over a layer selects it | `components/DesignerCanvas.tsx` (Selecto `dragCondition`), `components/BreakpointHeader.tsx` (marker attribute) | `DesignerCanvas.test.tsx` | S3 |
| 05 | **S5** Light-theme tint hierarchy | `components/PaneLayerTree.tsx` (row class helper) | `PaneLayerTree.test.tsx` | — |
| 06 | **S6** Layout controls do nothing | `lib/cssPropertyMapping.ts`, `components/BreakpointFrame.tsx` (children wrapper; amended) | `lib/cssPropertyMapping.test.ts`, `BreakpointFrame.test.tsx` | — |
| 07 | **S7** Moveable zoom handling | `components/DesignerCanvas.tsx`, `components/ables/DimensionAble.tsx` | `DesignerCanvas.test.tsx` | S4 |
| 08 | **S8** Size readout measures the wrong frame and zoomed px | `hooks/useLayerDimensions.ts`, `components/actions/ActionSize.tsx` (if needed) | `hooks/useLayerDimensions.test.tsx` | — |
| 09 | **S9** Deleting a breakpoint leaves its overrides behind | `hooks/useDesigner.ts` | `useDesigner.test.ts` | S2 |
| 10 | **P1** Cheap re-render fixes | `components/DesignerCanvas.tsx`, `hooks/useDesignerAction.ts`, `context/DesignerContext.tsx`, `hooks/useSelectedLayers.ts`, `hooks/useKeybindings.ts` | new `test/renderCounts.test.tsx` | S7 |
| 11 | **P2** External store and selectors | `context/DesignerContext.tsx`, `hooks/useDesigner.ts` (store wrapper only), new `hooks/useDesignerSelector.ts`, `hooks/use{Layers,LayerTypes,History,SelectedLayers}.ts` | `test/renderCounts.test.tsx`, `hooks/useDesignerSelector.test.tsx` | P1, S9 |
| 12 | **P3** Per-layer rendering and an id index | new `lib/layerIndex.ts`, new `hooks/useLayer.ts`, `components/BreakpointFrame.tsx`, `hooks/useSelectedLayers.ts`, `components/DesignerCanvas.tsx` (`getLayersAtPoint`), `components/PaneLayerTree.tsx` (lookup helpers) | `lib/layerIndex.test.ts`, `test/renderCounts.test.tsx` | P2, S5, S6 |
| 13 | **P4** Flat normalized state behind the nested API | `hooks/useDesigner.ts`, `lib/Types.ts`, new `lib/layerTree.ts`, `lib/layerIndex.ts`, `hooks/useLayers.ts`, `hooks/useLayer.ts`, `hooks/useSelectedLayers.ts` (both added before P4 started: P3 created `useLayer.ts`), `components/PaneLayerTree.tsx`; test helpers in `useDesigner.test.ts`, `fixtures.test.tsx`, `ActionFontFamily.test.tsx` | `lib/layerTree.test.ts`, existing suites | P3 |
| 14 | **I1** Frame-root registry (seam refactor; no behaviour change) | new `hooks/useFrameRegistry.tsx`, `components/BreakpointFrame.tsx`, `components/DesignerCanvas.tsx`, `hooks/useLayerDimensions.ts` | new `hooks/useFrameRegistry.test.tsx` | P3, S8 |
| 15 | **I2** Shadow-root style isolation | new `components/FrameShadowRoot.tsx`, `components/BreakpointFrame.tsx`, `hooks/useFrameRegistry.tsx`, `BreakpointFrame.test.tsx` (route queries through a shadow helper) | `components/FrameShadowRoot.test.tsx` | I1, S11 |
| 17 | **S10** Every panel control affects the canvas | `lib/cssPropertyMapping.ts`, `lib/layers/{frame,text,image,input}.tsx` (`supportedCssProperties`), panel action components only if a sub-value must be combined (`components/actions/Action{FlexWrap,GridLayout,Margin,TextDecoration,TextShadow,TextStyle,AlignItems,TextTransform}.tsx`) | new `lib/panelControls.test.tsx`, `lib/cssPropertyMapping.test.ts` | S6 |
| 18 | **S11** Border control writes a border style | `components/actions/ActionBorder.tsx`, `lib/layers/*.tsx` (only if `--border-style` is missing), `lib/cssPropertyMapping.ts` (only if needed) | `lib/panelControls.test.tsx` | S10 |
| 19 | **S12** Opacity control writes invalid values | `components/actions/ActionOpacity.tsx` | new `components/actions/ActionOpacity.test.tsx` | — |
| 16 | **L1** Zero lint warnings, enforced | `hooks/useDesigner.ts` (split `applyAction`), `components/PaneLayerTree.tsx`, `components/FrameStylesPanel.tsx`, `components/actions/{ActionElementType,ActionTextContent,ColorActionPopover}.tsx`, `package.json` (`lint` gets `--error-on-warnings`) | the gate itself | every other task |

**Order** (at most 2 fixers at once): S1 ∥ S2 → S3 ∥ S5 → S6 ∥ S8 → S4 ∥ S9 → S7 → P1 → P2 → P3
→ P4 ∥ I1 → I2 → L1 → Round 3 integration check. Start a task as soon as its blockers merge.
P4 and I1 touch disjoint files, so they run in parallel.

---

### S1 — Typing a frame font requests every prefix; comma lists build a broken URL

**Repro:**
- In Document Styles, type "Georgia" into the font field. `FontLoader` calls `loadFont` for "G",
  "Ge" … "Georgia", one Google Fonts `<link>` each, because the input dispatches on every keystroke.
- Typing `Inter, system-ui` or `"Open Sans", serif` produces a `family=` URL for the whole string.

**Fix:**
- New `lib/fontFamily.ts` with `primaryFontFamily(value)`. It returns the first family name, with
  quotes and whitespace stripped, or `null` for CSS generic families (`serif`, `sans-serif`,
  `system-ui`, `monospace`, `cursive`, `fantasy`, `ui-*`, `math`, `emoji`, `inherit`, `initial` …).
- `FontLoader` loads only primary families.
- `FontLoader` debounces the **frame** font by 400ms. Layer fonts picked from the list stay immediate.
- `loadFont` also runs its input through `primaryFontFamily`, so no caller can build a bad URL.

**Acceptance:**
- (fake timers) Dispatching the frame font as each prefix of "Georgia" within 400ms results in
  exactly one `loadFont("Georgia")`.
- `"Inter, system-ui"` loads "Inter" only; `'"Open Sans", serif'` loads "Open Sans";
  `"system-ui"` loads nothing.
- Layer and breakpoint-override fonts load without delay (R6 behaviour kept).
- Browser: typing "Georgia" by hand results in exactly one Georgia `<link>` in `<head>`.

**Test:** `bunx vitest run src/lib/fontFamily.test.ts src/components/FontLoader.test.tsx`, plus browser.

### S2 — Dragging a frame header creates one undo step per mousemove

**Repro:** `BreakpointHeader` dispatches `UPDATE_BREAKPOINT {position}` on every mousemove, and
`getCoalesceKey` returns `null` for that action. A long drag can push the rest of history out of
the 200-entry cap.

**Fix:** In `getCoalesceKey`, `UPDATE_BREAKPOINT` whose `updates` only has `position` returns
`bp-pos:<id>`. Other breakpoint updates (width, name) stay as they are.

**Acceptance:**
- 30 consecutive position updates for one breakpoint make 1 undo step, and one UNDO restores the
  original position.
- A width change between moves starts a new step.
- Browser: drag a frame, press Cmd+Z once, and the frame returns to its original position.

**Test:** `bunx vitest run src/hooks/useDesigner.test.ts -t "breakpoint drag"`, plus browser.

### S3 — The selection outline stays at the old position after a frame moves

**Repro:**
1. Select a layer in Tablet.
2. Drag the Tablet frame by its header.
3. Moveable's outline stays where the layer was, because `updateRect` runs only when CSS vars or
   zoom change.

**Fix:** Also call `moveableRef.current.updateRect()` (in a rAF) when breakpoint positions or
sizes change. Key the effect on a string built from `id:x:y:w:h` for each breakpoint.

**Acceptance:**
- Unit test (Moveable mock exposing `updateRect`): an `UPDATE_BREAKPOINT` position change triggers
  `updateRect`.
- Browser: after dragging the frame, the outline's box matches the selected layer's
  `getBoundingClientRect` within 1px.

**Test:** `bunx vitest run src/components/DesignerCanvas.test.tsx -t "outline follows frame"`, plus browser.

### S4 — Releasing a header drag over a layer selects that layer

**Repro:** Drag a frame by its header and release over a layer. Selecto treats the gesture as a
canvas click and selects the layer under the pointer.

**Fix:**
- Add `data-breakpoint-header` to the header wrapper in `BreakpointHeader.tsx`.
- Give Selecto a `dragCondition` that returns `false` when the input event's target is inside
  `[data-breakpoint-header]`.

**Acceptance:**
- Unit test: the captured `dragCondition` returns `false` for an event whose target is inside a
  header, and `true` for one on a layer.
- Browser: a header drag released over a layer leaves selection unchanged. Canvas click, drill-down
  and marquee still work.

**Test:** `bunx vitest run src/components/DesignerCanvas.test.tsx -t "header drag"`, plus browser.

### S5 — Light-theme subtree tint is near invisible

**Repro:** In the light theme, accent is `#f5f5f5` (about L96.5) on a white panel. The selected
row is barely darker than the panel, so a 30% tint is about L99 and doesn't read.

**Fix (user decision):** Move the row-state classes into a small helper. In the **light** theme,
selected uses a darker neutral (for example `bg-neutral-200`, about L90) and the subtree tint uses
`bg-accent` (L96.5). Hover sits visibly between the two. The **dark** theme is unchanged:
selected `bg-accent`, tint `bg-accent/30`, hover `bg-accent/50`. Use `dark:` variants.

**Acceptance:**
- Light theme, measured in a browser: lightness of none > tint > selected, with steps of at least
  3 L, and hover distinguishable from both.
- Dark theme computed colours equal round 2's.
- F's tests (A–E), plus a test asserting the light and dark class sets per row state.

**Test:** `bunx vitest run src/components/PaneLayerTree.test.tsx`, plus browser in both themes.

### S6 — Layout controls (display, flex, gap) have no effect on the canvas

**Repro:** `--display`, `--flex-direction`, `--align-items`, `--justify-content`, `--column-gap`
and `--row-gap` appear in the layer types' `supportedCssProperties`, but they're missing from
`CSS_VAR_TO_PROPERTY_MAP`, so `applyCssVars` drops them. Setting Display: Flex in the panel does
nothing.

**Fix:** Add the six mappings (`display`, `flexDirection`, `alignItems`, `justifyContent`,
`columnGap`, `rowGap`). Also check every `supportedCssProperties` entry across `lib/layers/*.tsx`
against the map, and add any other missing ones found.

**Acceptance:**
- Unit test: for every layer type, every supported property maps to a CSS property.
- `BreakpointFrame` test: a frame with `--display: flex; --column-gap: 12px` renders those inline.
- Browser: setting Display Flex and a gap in the panel changes the frame's children layout.

**Test:** `bunx vitest run src/lib/cssPropertyMapping.test.ts src/components/BreakpointFrame.test.tsx -t "layout"`, plus browser.

**Amendment (approved by the user after the S6 verifier's CONCERNS):** `BreakpointFrame.tsx`'s
`DesignerLayer` wraps a layer's rendered children in an extra plain `<div>`. That wrapper becomes
the only flex or grid item, so Display Flex and the gaps can't lay out the real children. S6's
scope now includes `components/BreakpointFrame.tsx`: remove that wrapper, or make it
`display: contents`, so each child's `.designer-layer` is a direct flex or grid item of the
container element.
- Extra acceptance (jsdom): each child's `.designer-layer` is a direct child of the parent layer's
  rendered element.
- Extra acceptance (browser): with Display Flex and direction Row, a frame's two children sit side
  by side, separated by the column gap.

### S7 — Moveable's zoom handling is broken

**Repro:**
- `DesignerCanvas` calls `moveableRef.current.getElement()`, which doesn't exist in Moveable 0.56,
  so the inverse-scale code never runs.
- `props={{ zoom: state.zoom }}` overrides Moveable's own `zoom` prop. Inside the zoomed viewer
  that should be `1 / zoom`, so handles and lines scale with the canvas zoom.

**Fix:**
- Delete the dead `getElement()` effect.
- Pass `zoom={1 / state.zoom}` to Moveable.
- Rename the custom able prop to `viewerZoom`, and update `DimensionAble` so its label shows
  unzoomed sizes and stays at a constant screen size.

**Acceptance:**
- Unit test: Moveable receives `zoom === 1/state.zoom`; ables receive `viewerZoom`; no `getElement`
  call remains.
- Browser: at zoom 0.5, 1 and 2, the handles' and label's screen size is constant within 1px, and
  the label text equals the layer's unzoomed CSS size.

**Test:** `bunx vitest run src/components/DesignerCanvas.test.tsx -t "zoom"`, plus browser.

**Correction (orchestrator, after the S7 verifier's FAIL; the acceptance criteria are unchanged):**
The fix text above assumed Moveable renders inside InfiniteViewer's scaled viewport. That's wrong.
Its control box lives in `.infinite-viewer-wrapper` (`transform: none`) and Moveable computes
positions in **screen space**. Measured on the base: handles and lines scale with zoom (6px at 0.5,
24px at 2) because `props.zoom: state.zoom` overrides Moveable's `zoom`. The dimension label was
already constant (67×19).

Correct direction:
- Don't override Moveable's `zoom`: leave its default of 1, or pass `zoom={1}` explicitly.
- Keep the `viewerZoom` rename for the ables.
- Don't counter-scale `DimensionAble`'s label.
- Unit tests must assert this real contract: Moveable's `zoom` is 1 or absent at every viewer zoom,
  and the label carries no zoom-dependent transform. The browser check is the final proof.

### S8 — Size readout measures the wrong frame, in zoomed pixels

**Repro:** `useLayerDimensions` queries `.designer-frame .designer-layer[...]`, which always matches
the Mobile frame first. It reports `getBoundingClientRect` (zoom-scaled) and reads the DOM during
render, so the value goes stale.

**Fix:**
- Measure the layer inside the **active** breakpoint's frame, using `offsetWidth`/`offsetHeight`
  (or rect divided by zoom).
- Measure in an effect, and keep it current with a `ResizeObserver`.

**Acceptance:**
- jsdom (mock rects/offsets): with Tablet active, the readout uses the Tablet element, the value is
  unzoomed, and it updates on resize.
- Browser: at zoom 0.5 and 2, the Size placeholders show the layer's CSS pixel size for the active
  frame.

**Test:** `bunx vitest run src/hooks/useLayerDimensions.test.tsx`, plus browser.

### S9 — Deleting a breakpoint leaves its overrides on every layer

**Repro:** `DELETE_BREAKPOINT` removes the breakpoint but leaves `breakpointCssVars[id]` on layers.

**Fix:** In the same history step, strip `breakpointCssVars[id]` from every layer, and drop empty
maps. UNDO restores both the breakpoint and the overrides.

**Acceptance:**
- After the delete, no layer has a key for that id.
- One UNDO restores the breakpoint and every override exactly.
- It is one undo step.

**Test:** `bunx vitest run src/hooks/useDesigner.test.ts -t "delete breakpoint"`

### S10 — Panel controls that write properties no layer supports (added by the user mid-round)

**Repro:** S6's audit found panel controls that write CSS vars which no layer type lists in
`supportedCssProperties`, or which `CSS_VAR_TO_PROPERTY_MAP` doesn't map:
- `--flex-wrap` (`ActionFlexWrap`);
- `--grid-template-columns` and `--grid-template-rows` (`ActionGridLayout`);
- `--margin-top/right/bottom/left` (`ActionMargin`; layers only accept `--margin-block-*` and
  `--margin-inline-*`);
- possibly `--text-decoration-*` and `--text-shadow-*` sub-values, and `--text-style` (they may be
  internal parts the panel combines into `--text-decoration` and `--text-shadow`).

**Fix:**
- For each control, find what it dispatches.
- Where a var is a real CSS property, map it and add it to the right layer types. Margin controls
  should write the same logical properties layers support, or the map should accept the physical
  ones; choose one model and report which.
- Where it's a sub-value, either combine it into the real property when dispatching, or confirm
  it's already combined and the sub-var is only internal UI state that never needs rendering.

**Acceptance:**
- A table-driven test: for each panel control that writes layer CSS, rendering a layer of a type
  that shows that control, with the control's output, produces the expected inline CSS property.
- Browser: flex-wrap, grid template, per-side margin, text decoration and text shadow each visibly
  change the canvas.
- No control writes a var that's neither rendered nor documented as internal.
- **(Amended per the user, from the S6 verifier.)** Every value a control writes is valid CSS for its property. For example, Align "Center" currently writes `flex-center`; the table-driven test checks this with `CSS.supports` (or an allowlist where jsdom lacks it). `components/actions/ActionAlignItems.tsx` joins S10's files.

**Test:** `bunx vitest run src/lib/panelControls.test.tsx src/lib/cssPropertyMapping.test.ts`, plus browser (port 5317).

**Amendment (user decisions after the S10 fixer's audit):**
1. Text Transform "Normal" writes `none` (valid CSS). `ActionTextTransform.tsx` joins S10's files,
   and the expected-fail test becomes a normal test.
2. **Accepted:** the text-shadow parts (`--text-shadow-offset-x/-y/-blur-radius/-color`) are
   combined into `text-shadow` inside `applyCssVars` at render time, not at dispatch. An explicit
   `--text-shadow` wins. The parts are documented as internal panel vars.
3. **Included:** the image layer supports every control the panel shows for it (Display, Padding,
   Background, Border and the corner radii, among others), or the panel hides controls a layer type
   doesn't support. Choose one consistent rule and report it. Also, the TextShadow trigger label
   reads the shadow vars, not `--text-decoration`, so `ActionTextShadow.tsx` is in scope.

### S11 — The Border control never sets a border style (added by the user mid-round)

**Repro:** The Border control writes `--border-width` and `--border-color` but never
`--border-style`. Borders only show today because the editor's Tailwind preflight leaks
`border-style: solid` onto every element. After I2 isolates designs, the Border controls would show
nothing.

**Fix:**
- Add a border-style choice to the Border control: none, solid, dashed, dotted, double.
- When a width is set and no style has been chosen, write `--border-style: solid`, so width alone
  produces a visible border.
- Make sure `--border-style` is mapped and supported by every layer type that shows the Border
  control.

**Acceptance:**
- The panel test drives the real Border control and gets a valid `border-style` value on the
  rendered element.
- Setting only a width yields `solid`; choosing dashed renders `dashed`; none removes it.
- Every style option is valid CSS (allowlist).
- Browser: a border is visible on frame, text, image and input layers. It stays visible with
  Tailwind's preflight disabled, which can be simulated by checking that the inline
  `border-style` is set.

**Test:** `bunx vitest run src/lib/panelControls.test.tsx -t "border"`, plus browser (port 5318).

### S12 — The Opacity control writes `opacity: 50` (added by the user mid-round)

**Repro:** Setting Opacity 50 in the panel stores `--opacity: 50`, which renders `opacity: 50`. CSS
opacity takes 0–1 (or a percentage), so the browser clamps it to fully opaque and the layer never
fades. Found by the P2 verifier.

**Fix:**
- Keep the 0–100 UI, but write a valid value (`0.5`, or `50%`; choose one and report it).
- Display stored values correctly, including any legacy values above 1 written by the old control,
  read as a percentage.
- Stay within `ActionOpacity.tsx` (S11 is editing the CSS mapping concurrently).

**Acceptance:**
- Driving the real control to 50 stores a valid CSS opacity, and a rendered layer gets an inline
  opacity that computes to 0.5.
- 0 and 100 map to 0 and 1.
- The control displays 50 for both the new value and a legacy `50`.
- It is breakpoint-aware like other controls, if it already was.
- Browser: the layer visibly fades, with computed `opacity: 0.5`.

**Test:** `bunx vitest run src/components/actions/ActionOpacity.test.tsx`, plus browser (port 5319).

### P1 — Cheap re-render fixes

**Repro:**
- `SET_PAN` is dispatched on every scroll event, and nothing reads `state.pan`, so every scroll
  re-renders about 45 context consumers, including every layer in all 3 frames.
- `useDesignerAction` returns a new function on every render, so the canvas keydown listener is
  re-attached constantly.
- `useKeybindings` re-subscribes on every layer edit.
- `useSelectedLayers` builds a new array and walks the whole tree on every call.

**Fix:**
- Stop dispatching `SET_PAN` from scroll. Keep the action and the field for API compatibility.
- `useDesignerAction` returns the stable `dispatch`.
- Memoise the provider value, and split it into a state context and a dispatch context
  (`useDesignerContext` keeps working).
- `useSelectedLayers` memoises on `[layers, selectedLayers]`.
- `useKeybindings` reads the latest state through a ref.

**Acceptance** (new `test/renderCounts.test.tsx`, React `Profiler` render counters):
- A scroll on the canvas causes **0** commits of the layer components.
- A component that only dispatches doesn't re-render on state changes.
- The window keydown listener is added once across 20 state changes (spy on
  `addEventListener`).
- Every existing test passes.

**Test:** `bunx vitest run src/test/renderCounts.test.tsx`, plus a browser check that scroll,
zoom and shortcuts still work.

### P2 — External store and selector hooks

**Fix:**
- Keep the reducer, and run it in a small store held in a ref, with `getState`, `dispatch` and
  `subscribe`. The context value becomes stable.
- Add `useDesignerSelector(selector, isEqual = Object.is)`, built on `useSyncExternalStore`.
- Move `useLayers`, `useLayerTypes`, `useHistory`, `useSelectedLayers` and a new `useZoom` onto
  selectors.
- `useDesignerContext()` stays, subscribing to the whole state, for anything not yet moved.
- Keep the controlled-mode effects (`SET_LAYERS` echo, `onLayersChange`) working.

**Acceptance:**
- A zoom change doesn't re-render layer-tree rows or the action controls.
- An `UPDATE_LAYER_CSS` doesn't re-render the zoom control.
- Selector equality prevents re-renders when the selected slice is unchanged.
- Every existing test passes.

**Test:** `bunx vitest run src/hooks/useDesignerSelector.test.tsx src/test/renderCounts.test.tsx`

**Amendment (approved by the user after the P2 fixer's report):**
1. `hooks/useDesignerContext.ts` joins P2's files. The context now holds the store, so this hook
   derives a memoised `{state, dispatch}` from a whole-state selector, and every unmigrated caller
   keeps working.
2. One existing assertion changes, as an exception to "existing tests pass unchanged". P1's
   `useSelectedLayers` reference test asserted that the probe *re-renders* after `SET_ZOOM`
   (`seen.length > count`). That was only true because of the over-rendering P2 removes, so it is
   inverted to `toBe(count)`. Its reference-stability assertion is unchanged.
3. **(After the P2 verifier's CONCERNS, approved by the user)** `components/ZoomControl.tsx` and
   `components/PaneLayerTree.tsx` join P2. Both switch from whole-state `useDesignerContext()` to
   selector hooks (`useZoom`, `useLayers`, `useSelectedLayers`, `useLayerTypes`, and breakpoint and
   active-breakpoint selectors as needed), and so do the tree rows. The two render-count bullets
   must be proven on the **real** components: a zoom change causes 0 commits of `PaneLayerTree` and
   its rows, and an `UPDATE_LAYER_CSS` causes 0 commits of `ZoomControl`.

### P3 — Per-layer rendering and an id index

**Fix:**
- `lib/layerIndex.ts` builds `{byId, parentId, depth, order}`, memoised per layers array in a
  WeakMap.
- `useLayer(id)` is a selector that returns the layer object.
- `DesignerLayer` becomes `memo({id, breakpointId})`, reading `useLayer(id)`, `layerTypes` and
  sorted breakpoints (sorted once per breakpoints array). It no longer receives the whole `state`.
- Replace the recursive lookups with index lookups: `findLayersById` in `useSelectedLayers`,
  `findLayer` in `getLayersAtPoint`, and `findLayerById`/`isDescendantOf`/`getDescendantIds` in
  `PaneLayerTree`.

**Acceptance:**
- `UPDATE_LAYER_CSS` on layer X re-renders only X and its ancestors' `DesignerLayer` instances (in
  each frame). Siblings and other subtrees render 0 times.
- Index lookups match the old recursive helpers on randomised trees (property test, 200 trees).
- Every existing test, and the browser checks for selection and drill-down, still pass.

**Test:** `bunx vitest run src/lib/layerIndex.test.ts src/test/renderCounts.test.tsx`, plus browser.

**Correction and amendment (approved by the user after the P3 fixer stopped):** the plan wrongly
assumed `updateLayerById` keeps untouched subtrees' identity. It rebuilds every layer that has
children, so editing A11 also gives the unrelated layer B a new object. `hooks/useDesigner.ts`
(`updateLayerById` only) joins P3: when nothing in a layer's subtree changed, return the original
layer object and children array. Existing reducer tests must still pass unchanged.

### P4 — Flat normalized state behind the nested API

**Fix:**
- State holds `nodes: Record<id, Node>`, where `Node` is `Layer` minus `children`, plus
  `childIds`, `parentId` and `rootIds`. `Doc` snapshots become `{nodes, rootIds, breakpoints,
  frameStyles}`.
- `lib/layerTree.ts` provides `normalize(Layer[])` and `denormalize(nodes, rootIds)`, memoised.
- Convert at the edges: initial `layers`/`defaultLayers` and `SET_LAYERS` normalise on the way in.
  `onLayersChange` and `useLayers()` return the memoised nested array. React Aria's `Tree` needs
  nested `items`, so it keeps using that.
- The `SET_LAYERS` echo check compares against the last emitted nested array.
- Reducer operations become id-based, and `addHistoryEntry` stays the single commit point.

**Acceptance:**
- The public API is unchanged: nested `Layer[]` in, and `onLayersChange` gets nested `Layer[]` out.
- `normalize`/`denormalize` round-trip is identity on randomised trees.
- Every Round 1–2 reducer behaviour still passes. Test helpers may change to read through
  `denormalize`, but **assertions may not**.
- Editing node X leaves every other node object, and `rootIds`, `===` identical.
- Browser: Round 1–2 spot-checks pass (insert inside, move, undo/redo, delete).

**Test:** `bunx vitest run src/lib/layerTree.test.ts src/hooks/useDesigner.test.ts`, plus the full suite.

**Amendment (approved by the user after the P4 fixer's report):** one existing assertion changes,
as an exception to "assertions may not change". The history test's expected `Doc` keys go from
`[breakpoints, frameStyles, layers]` to `[breakpoints, frameStyles, nodes, rootIds]`, which is the
plan's own `Doc` shape. No other assertion may change.

### I1 — Frame-root registry (seam refactor, no behaviour change)

**Fix:**
- Add a `FrameRegistry` context: breakpoint id → frame root element (today, `.breakpoint-content`),
  with `getFrameRoot(id)`, `queryLayer(bpId, layerId)` and `layersAtPoint(x, y)`.
- Route every design-DOM query through it: `selectedLayerElements`, `getLayersAtPoint`
  (`elementsFromPoint` on each root), `useLayerDimensions`, and Selecto `selectableTargets` (in its
  function form).
- Fix `StructureAble`'s `instanceof HTMLElement` check to a `nodeType === 1` check.

**Acceptance:**
- No `document.querySelector`/`elementsFromPoint` on design nodes remains outside the registry
  (grep).
- Registry unit tests pass.
- All existing tests and the browser checks for selection, drill-down, marquee, Moveable and the
  "+" buttons pass unchanged.

**Test:** `bunx vitest run src/hooks/useFrameRegistry.test.tsx`, plus browser.

### I2 — Shadow-root style isolation

**Fix:**
- `FrameShadowRoot` attaches an open shadow root to each frame host, and portals the design
  content into it.
- Its baseline stylesheet is `:host { all: initial; display: block; position: relative }`, plus a
  root reset so the content gets UA defaults, not the editor's Tailwind preflight.
- Frame styles and the `#fff`/`#000` fallbacks go on the shadow root's top-level container.
- The registry returns the shadow root's container.
- `getLayersAtPoint` uses `shadowRoot.elementsFromPoint`.
- Update the `BreakpointFrame.test.tsx` queries through a `frameRoot(bpId)` test helper. Assertions
  are unchanged.

**Acceptance:**
- Browser, inside a frame:
  - an `h1` text layer computes the UA default `font-size` (2em) and margins;
  - a layer with only `--border-width` shows no border (no preflight `border-style: solid`);
  - no editor class or theme style reaches design nodes.
- Browser: selection, drill-down, marquee, Moveable box alignment (±1px at zoom 0.5, 1 and 2),
  the "+" buttons and keyboard shortcuts after clicking a layer all still work.
- Fonts load inside frames.
- Every Round 1–2 browser criterion that touches frames (B5, B6, B7, R5, R6) still holds.

**Test:** `bunx vitest run src/components/FrameShadowRoot.test.tsx src/components/BreakpointFrame.test.tsx`, plus browser.

### L1 — Zero lint warnings, enforced

**Fix:**
- Split `applyAction` into a per-action handler map (no behaviour change).
- Extract `PaneLayerTree`'s row `className` function (this may already be gone after S5).
- Apply the four `useOptionalChain` fixes.
- Change the `lint` script to `biome check . --error-on-warnings`.

**Acceptance:**
- `bun run lint` exits 0 with **0 warnings**.
- Every test passes unchanged.

**Test:** `bun run lint && bun run test`

### Verification (end to end)

1. Each task: its test command, the gate, and the blind verifier, with browser checks for UI tasks.
2. Round 3 integration check, by a fresh verifier on `fix/review-bugs`:
   - every per-entry test command from Rounds 1, 2 and 3;
   - `bun run lint` with 0 warnings;
   - browser re-checks of the Round 3 criteria, plus spot-checks of R1–R6, F, B5–B9 and undo/redo.
3. End-of-run report: verdicts, retry counts, blocked tasks, gate output and screenshots.
   Nothing is pushed and no PR is opened unless asked.

### Out of scope (logged)

- Per-frame `@media` via iframe, and HTML export.
- Headless core package, `applyOps`, MCP server.
- React 19 / Vite 7 upgrade, bundle split, README refresh.
- The `App.tsx` sample data's explicit colours.

**Process fix (orchestrator):** the S10 merge conflicted in PLAN.md, and the conflict markers were committed in merge `0f939bb`, because `git merge … | tail` masked the exit code. They were resolved in the next commit. Merges now run without a pipe and stop the chain on a non-zero exit. **That still failed for S11** (merge `33c1b4c`): the shell is zsh, and `! grep` guards are exempt from errexit. All merges now go through `scratchpad/merge-task.sh`, run with bash, which checks every exit code explicitly, runs `git merge --abort` on conflict, and refuses to continue if any conflict marker remains.

### Round 3 verdict log

- [x] S1 · [x] S2 · [x] S3 · [x] S4 · [x] S5 · [x] S6 · [x] S7 · [x] S8 · [x] S9 · [x] P1 · [x] P2 · [x] P3 · [x] P4 · [ ] I1 · [ ] I2 · [x] S10 · [x] S11 · [x] S12 · [ ] L1

- S2: PASS at `29f5ad2`, first round. In the browser, a 20-step drag was undone by one Cmd+Z, and redo restored it. Merged as `d4e6002`. Note: the X/Y position inputs also coalesce with a drag on the same frame (by design).
- S1: PASS at `8dfbf5b`, first round. The verdict was formatted as 'CONCERNS: none blocking / PASS' and treated as PASS. In the browser, typing Georgia gives 1 link and 'Inter, system-ui' loads Inter only. Merged as `d2bee72`. Notes: no test covers a layer-font change after mount (the code path is not debounced, confirmed in the browser); `preloadFont` skips `primaryFontFamily` (hover only).
- S5: PASS at `548d1b9`, first round. Light theme: none L100 > tint L96.5 > hover L91 > selected L85, with selected-row text contrast 12:1. Dark theme identical to the base. Merged as `2450d4c`. The tint test helpers now assert `dark:bg-accent/30` (an equivalent check). Selected uses neutral-300 rather than the suggested neutral-200, which meets the criteria.
- S3: PASS at `f82e348`, first round. In the browser at zoom 50%, 100% and 200%, the outline follows frame drags, offset only by half the stroke width. Merged as `9d1b3a1`.
- S8: PASS at `2147510`, first round. In the browser at zoom 0.5, 0.7 and 2, the readout equals the Tablet `offsetWidth` and updates live. Merged as `e1f1b6b`. New follow-up: `ActionSize`'s Width/Height trigger labels use base `cssVars`, not the active breakpoint's override.
- S9: PASS at `e7c1a83`, first round. In the browser: delete Tablet and its override disappears from Desktop; one Cmd+Z restores both. Merged as `d8c7465`.
- S4: PASS at `c133278`, first round. In the browser, a header drag released over a layer keeps the selection; click, drill-down, marquee and '+' still work. Merged as `9aa38ab`. Note: the test's Selecto mock triggers a cosmetic forwardRef arity warning.
- S6: PASS at `ff44dfe` after 1 retry round. CONCERNS: the children wrapper `<div>` blocked flex layout, so the scope was amended with user approval and the wrapper replaced by a fragment. In the browser, Row with a 24px gap measures 24.0 and Column with a 10px gap measures 10.0. Merged as `e773a06`.
- S10: PASS at `34f6546` (the user decided 3 open points mid-task; the verdict was formatted as 'CONCERNS: none (PASS)'). Every control was browser-checked: wrap, grid, margins, align center, transform, decoration, shadow, position and image styles. 50 tests fail on the old code. Merged as `741e50c`. Notes: the TextShadow label shows '0 0 0' when only a colour is set; the colour input needs a leading '#'.
- S7: PASS at `178b64c` after 1 retry round. FAIL: the plan's premise was wrong (Moveable renders in screen space), so the orchestrator corrected the fix text. Handle 12×12, line 1px and label 67×19 are constant at zoom 0.5, 1 and 2, against a base range of 6–24px. Control-box clicks are ignored properly. Merged as `a39bd12`.
- P1: PASS at `4559eea`, first round. Old code vs new: scroll 1→0 commits, dispatch-only 5→0, keydown adds 42→2. In the browser, scroll causes 0 React commits, and shortcuts act on the latest state. Merged as `b9c4975`.
- S11: PASS at `f74362c` after 1 retry round. CONCERNS: a Tablet style was overwritten, and the X-clear left a stray style; fixed with a render-time `solid` default plus a breakpoint-aware Style select. Browser with preflight simulated off: borders visible, and cleared borders draw nothing. One S10 assertion changed (border-width renders 2 keys), judged a necessary consequence. Merged as `f6b3f11`. Note: the `ActionBorder` trigger label reads base cssVars (pre-existing).
- P2: PASS at `ed26156` after 1 retry round. CONCERNS: the render-count proof was hook-level only, so the user approved migrating `ZoomControl` and `PaneLayerTree`. Two amendments were approved (`useDesignerContext.ts`; one inverted P1 assertion). In the browser, zoom causes 0 `PaneLayerTree` re-renders. Merged as `ce31087`. Note: a newly added breakpoint's tree section starts collapsed (pre-existing).
- S12: PASS at `d0f91d1` after 1 retry round. CONCERNS: an inherited value displayed as explicit, now marked like `NumericActionControl`. In the browser, computed opacity is 0.5 with a visible fade, the Tablet override works, and the inherited tooltip shows. Merged as `bb94d46`. Note: legacy '1' reads as 100% (documented).
- P3: PASS at `b18b973`, first verification. The fixer stopped on a wrong plan premise (`updateLayerById` sharing); the user approved adding the reducer fix. The cascade matches `getEffectiveStyles` on 2000 random cases, and sharing is correct on 300 random trees. In the browser, one edit re-renders only its ancestry. Merged as `4cd85ee`. Note: layer move/reorder was not browser-exercised, so it must be covered in P4's verification.
- P4: PASS at `05413f1` after 1 retry round. CONCERNS: DELETE_BREAKPOINT became a no-op without overrides (found by a differential fuzz); ADD_LAYER with a duplicate id pushed history. Doc-keys assertion change approved by the user. Final differential: 0 divergences over 2400 random trees × 25 ops. Browser: delete breakpoint, insert, move on/before/after, undo/redo all good. Merged as `e8c8a0c`. Notes: `state.layers` is a derived non-enumerable accessor; reducer complexity is 23.

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
- Layer-tree row click (above).
- Typing a frame font by hand requests every prefix ("G", "Ge", ...), because the frame-styles input
  dispatches on each keystroke and `FontLoader` now loads the frame font. A comma list such as "Inter, system-ui"
  builds a malformed font URL. Fix: debounce the input, or load only the first family. (R6 verifier note.)
- After dragging a frame by its header, the Moveable selection outline stays at the old position, and a drag released
  over a layer selects that layer through Selecto. (Round 2 final check; not yet triaged as pre-existing or new.)
- The light-theme subtree tint is faint (about L97 against L96.5).
- **Panel controls read base `cssVars`, not the active breakpoint's effective values:** the Display select shows "Block" on Desktop after Flex is set there, and the flex sub-controls stay hidden (S6 verifier); the `ActionSize` Width/Height labels behave the same way (S8 verifier). Also, the Typography panel shows "Arial" for text that inherits the frame font
  (`ActionFontFamily.tsx` fallback).
- Headless core package, `applyOps`, MCP server.
- React 19 / Vite 7 upgrade; bundle split; README refresh.
