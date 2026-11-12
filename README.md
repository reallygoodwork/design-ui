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

## Tech stack

- React 18, TypeScript and Vite
- Tailwind CSS 4 and Base UI
- Vitest and Testing Library
- Biome for linting and formatting
