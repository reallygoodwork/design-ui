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

- [x] T0 · [x] B1 · [x] B9 · [ ] B5 · [ ] H · [ ] B6 · [ ] B7 · [ ] B8 · [ ] F

**Verdict log:**
- T0: PASS at `ad81b8b` after 2 retry rounds (CONCERNS ×2: `biome.json` scope and fixture name, both approved as amendments; then fixture helpers not exercised, fixed). Merged as `42a0b1c`.
- B9: PASS at `23eeff2`, first round. Merged as `bce2d23`. Manual browser check still pending (end of run).
- B1: PASS at `d62a130`, first round (after the worktree-base restart). Merged as `ae9e825`.

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
- Headless core package, `applyOps`, MCP server.
- React 19 / Vite 7 upgrade; bundle split; README refresh.
