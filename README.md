# Design UI

A design format and an editor for it. A builder decides what may change: which layers are fixed, which styles can move, which values are allowed. Then people and AI agents edit within those rules, and the design ships as React or plain HTML.

- **One format.** A design is a JSON document with a [schema](packages/core/schema/document.v1.json): layers, breakpoints, tokens, rules, comments and a log of every change.
- **Rules you set.** Lock a layout, allow only tokens for color, cap a font size. The rules live in the document, so they travel with it.
- **People and agents, within them.** Editors and agents send the same actions, and each one is checked before it lands. Every change is logged with who made it and why.
- **Delivery anywhere.** Render a saved design in React with `DesignView`, or export one HTML page.

The docs explain each part with live examples: run `bun run dev` and open `http://localhost:5173`.

## Use it in your app

The packages aren't on npm yet. Build and pack them, then install the tarballs:

```bash
git clone <repository-url>
cd design-ui
bun install
bun run build:packages
bun run pack:packages
```

```bash
npm install ./design-ui/.packs/design-ui-core-0.1.0.tgz ./design-ui/.packs/design-ui-react-0.1.0.tgz ./design-ui/.packs/design-ui-mcp-0.1.0.tgz
```

Import the stylesheet once (see [Styling the editor in your app](#styling-the-editor-in-your-app)), then add an editor with rules:

```tsx
import type { Rule } from "@design-ui/core";
import * as UI from "@design-ui/react";
import "@design-ui/react/styles.css";

const rules: Rule[] = [
  { id: "title", target: { layerIds: ["title"] }, editableProperties: ["--color"] },
];

export const Editor = () => (
  <UI.Designer
    defaultLayers={[{ id: "title", type: "text", name: "Title", value: "Hello" }]}
    breakpoints={[{ id: "mobile", name: "Mobile", width: 375, height: 667, position: { x: 0, y: 0 } }]}
    rules={rules}
    role="editor"
  >
    <UI.DesignerContent>
      <UI.DesignerCanvas>
        <UI.DesignerFrame />
      </UI.DesignerCanvas>
      <UI.DesignPanel>
        <UI.DesignActionPanel />
      </UI.DesignPanel>
    </UI.DesignerContent>
  </UI.Designer>
);
```

Builders (`role="builder"`, the default) aren't limited by rules and can change them from the Rules tab. Editors work within them, and agents always count as editors.

## Work on this repo

You need [Bun](https://bun.sh) 1.2 or later.

```bash
bun install
bun run dev
```

The docs open at `http://localhost:5173` and the demo editor at `http://localhost:5173/demo/`. Inside the repo, imports resolve to each package's source, so there's nothing to build while you work.

### Other commands

| Command | What it does |
| --- | --- |
| `bun run test` | Run the tests |
| `bun run lint` | Check formatting and lint rules |
| `bun run build` | Build the docs and the editor into `dist/` |
| `bun run preview` | Serve the production build |
| `bun run agent` | Start the MCP server for an agent |
| `bun run build:css` | Build the editor's stylesheet into `packages/react/styles.css`, for apps without Tailwind |
| `bun run build:packages` | Build `@design-ui/core`, `@design-ui/react` and `@design-ui/mcp` |
| `bun run smoke` | Build and pack the packages, install the tarballs in `apps/smoke`, and build it |
| `bun run example:plain-host` | Run a plain React app that hosts the editor with only that stylesheet |

## Working with an agent

An agent can read the design and its rules, pick up tasks you assign it, change the design, and resolve the task, always within the rules. It connects through `design-ui-mcp`, an MCP server that works in two ways:

- **In an open editor.** Give `Designer` an `agentUrl` (the default port is `ws://localhost:8790`). The server relays the agent's requests to the editor, and changes appear live.
- **On a design file.** Pass a file, as in `npx design-ui-mcp ./design.json`. With no editor open, the server works on the file and saves each change. When an editor connects, it shows that file, and its changes are saved back.

To try it with the demo:

1. Add the server to your MCP client. For Claude Code, from this folder:
   ```bash
   claude mcp add design -- bun run agent
   ```
   Any MCP client works; the command is `bun run agent`, run from this folder. In your own app, it's `npx design-ui-mcp`.
2. Run the editor (`bun run dev`) and open `/demo/`. The **Activity** tab says *Agent connected*.
3. Leave a task: press **C** and click a layer, or write in Activity, and choose **Task**. Keep *For the agent* ticked, or press **Assign to agent** on an existing task.
4. Ask the agent to work through its tasks, for example: *"Work through the open design tasks."*

The agent's tools: `get_design`, `get_rules`, `allowed_changes`, `list_tasks`, `wait_for_task`, `claim_task`, `apply_changes`, `set_token`, `reply`, `resolve_task`, `check_document` and `export_html`.
- Every change needs a reason, which shows next to the change in Activity.
- Changes are linked to their task, and you can undo or revert any of them.
- Agents can only make editing actions. Invalid ones, and ones the rules don't allow, are rejected before anything changes.

`useDesignerApi()` gives host apps the same abilities: `dispatch(action, { actor, reason })`, `annotate(…)`, and `exportDocument()`.

## Styling the editor in your app

You don't need Tailwind. Import the built stylesheet once:

```ts
import "@design-ui/react/styles.css";
```

In this repo, `bun run build:css` builds it.

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

## Packages

| Package | What it is |
| --- | --- |
| `@design-ui/core` (`packages/core`) | The design format: types, actions, rules, validation, tokens, and HTML/CSS export. No UI. |
| `@design-ui/react` (`packages/react`) | The editor's React components and hooks, `DesignView`, and `styles.css`. React 18 or 19. |
| `@design-ui/mcp` (`packages/mcp`) | The MCP server, as the `design-ui-mcp` command. Node 20 or later. |

The names are placeholders, and nothing is published yet. Inside the repo, imports resolve to each package's source through the `@design-ui/source` export condition. `bun run smoke` checks the packages the way an app would see them: from their tarballs, through their entry points only.

## Tech stack

- React 18, TypeScript and Vite
- Tailwind CSS 4 and Base UI
- Vitest and Testing Library
- Biome for linting and formatting
