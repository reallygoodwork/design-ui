# Coral Design

A React-based design tool built with Vite, TypeScript, and Tailwind CSS.

## Getting started

You need [Bun](https://bun.sh) 1.2 or later.

```bash
git clone <repository-url>
cd coral-design
bun install
bun run dev
```

The docs open at `http://localhost:5173` and the editor at `http://localhost:5173/demo/`.

### Other commands

| Command | What it does |
| --- | --- |
| `bun run test` | Run the tests |
| `bun run lint` | Check formatting and lint rules |
| `bun run build` | Build the docs and the editor into `dist/` |
| `bun run preview` | Serve the production build |
| `bun run agent` | Start the MCP server for an agent |
| `bun run build:css` | Build the editor's stylesheet into `build/styles.css`, for apps without Tailwind |
| `bun run example:plain-host` | Run a plain React app that hosts the editor with only that stylesheet |

## Working with an agent

An agent can read the design, pick up tasks you assign it, change the design, and resolve the task. It connects through an MCP server that relays to the open editor over a WebSocket on `localhost:8790`.

1. Add the server to your MCP client. For Claude Code, from this folder:
   ```bash
   claude mcp add coral -- bun agent/mcp-server.ts
   ```
   Any MCP client works; the command is `bun agent/mcp-server.ts` (or `bun run agent`).
2. Run the editor (`bun run dev`) and open `/demo/`. The **Activity** tab says *Agent connected*.
3. Leave a task: press **C** and click a layer, or write in Activity, and choose **Task**. Keep *For the agent* ticked, or press **Assign to agent** on an existing task.
4. Ask the agent to work through its tasks, for example: *"Work through the open Coral design tasks."*

The agent's tools: `get_design`, `list_tasks`, `wait_for_task`, `claim_task`, `apply_changes`, `set_token`, `reply`, `resolve_task`.
- Every change needs a reason, which shows next to the change in Activity.
- Changes are linked to their task, and you can undo or revert any of them.
- Agents can only make editing actions, and invalid ones are rejected before anything changes.

`useDesignerApi()` gives host apps the same abilities: `dispatch(action, { actor, reason })`, `annotate(…)`, and `exportDocument()`.

## Styling the editor in your app

You don't need Tailwind. Run `bun run build:css` and import `build/styles.css` once:

```ts
import "./styles.css";
```

Everything in it applies only inside the editor: the `Designer` root and its popups carry the `ds` class, and every rule is scoped to it. It has no global reset, so the rest of your page keeps its own styles, and your page's styles don't leak into the editor. Load the fonts yourself (the editor uses Geist and Geist Mono, and falls back to the system font).

### Theming

The editor's colors, radius and fonts are CSS variables with a `--ds-` prefix. Override them on `.ds` in a stylesheet loaded after the editor's, or with a more specific selector:

```css
.ds {
  --ds-accent: oklch(60% 0.2 145);
  --ds-accent-strong: oklch(52% 0.2 145);
  --ds-radius: 4px;
  --ds-font-sans: "Inter", system-ui, sans-serif;
}
```

| Variable | What it colors |
| --- | --- |
| `--ds-canvas` | The canvas behind the frames, and tracks of tabs and segmented controls |
| `--ds-background` | Panels |
| `--ds-card` | Cards on the panels |
| `--ds-input`, `--ds-hover`, `--ds-selected`, `--ds-raised` | Fields, hovered rows, selected rows, and thumbs of tabs |
| `--ds-popover` | Menus, popovers and dialogs |
| `--ds-border`, `--ds-border-strong` | Lines |
| `--ds-foreground`, `--ds-muted-foreground` | Text, and quieter text |
| `--ds-ring` | Focus rings |
| `--ds-accent`, `--ds-accent-strong`, `--ds-accent-soft`, `--ds-accent-text` | Selection, primary actions and links |
| `--ds-destructive` | Deleting and errors |
| `--ds-cat-layer`, `--ds-cat-layout`, `--ds-cat-color`, `--ds-cat-type`, `--ds-cat-motion`, `--ds-cat-image` | Icons for each kind of control |
| `--ds-shadow-overlay` | Shadow under menus and dialogs |
| `--ds-radius` | Corner radius; smaller and larger radii are worked out from it |
| `--ds-font-sans`, `--ds-font-mono` | Labels and text, and values and code |

For dark mode, put the `dark` class on the editor's root or any element above it, like `<html>`. Dark values sit in `.dark .ds`; override them there.

## Tech stack

- React 18, TypeScript and Vite
- Tailwind CSS 4 and Base UI
- Vitest and Testing Library
- Biome for linting and formatting
