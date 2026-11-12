# Coral Design

A React-based design tool built with Vite, TypeScript, and Tailwind CSS.

## Getting Started

### Prerequisites

- Node.js (v16 or higher recommended)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd coral-design
```

2. Install dependencies:
```bash
npm install
```

### Running Locally

#### Development Server

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

#### Storybook

Run Storybook for component development:
```bash
npm run storybook
```

Storybook will be available at `http://localhost:6006`

### Build

Create a production build:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

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

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS 4
- Base UI
- Storybook
