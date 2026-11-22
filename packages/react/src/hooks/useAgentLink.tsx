import {
	AGENT,
	type AgentEditor,
	type AgentRequest,
	type AgentResponse,
	type DesignDocument,
	denormalize,
	type EditorEvent,
	firstRejection,
	handleAgentRequest,
	type ServerEvent,
	taskView,
} from "@design-ui/core";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { DesignerContext } from "../context/DesignerContext";
import { useAnnotations } from "./useAnnotations";
import { useChangeLog } from "./useChangeLog";
import { useDesignerApi } from "./useDesignerApi";
import { useTokens } from "./useTokens";

const RETRY_DELAYS = [1000, 3000, 6000];

export type AgentStatus = "off" | "connecting" | "connected" | "disconnected";

type AgentLink = {
	status: AgentStatus;
	url?: string;
	/** Tries to reach the agent again, e.g. after starting its server. */
	connect: () => void;
};

const AgentLinkContext = createContext<AgentLink>({
	status: "off",
	connect: () => {},
});

/**
 * Connects the editor to an agent's server over a WebSocket and answers its
 * requests: read the design and tasks, claim a task, make changes with a
 * reason, reply, resolve. Tasks assigned to the agent are pushed to it.
 * It tries once on load, then only when asked (or when a task is assigned),
 * so a missing agent doesn't fill the console with errors.
 */
export const AgentLinkProvider = ({
	url,
	children,
}: {
	url?: string;
	children: ReactNode;
}) => {
	const store = useContext(DesignerContext);
	const tokens = useTokens();
	const log = useChangeLog();
	const notes = useAnnotations();
	const [status, setStatus] = useState<AgentStatus>(url ? "connecting" : "off");
	const socket = useRef<WebSocket | null>(null);
	const [attempt, setAttempt] = useState(0);
	// A few spaced retries, e.g. while the agent's server starts, then quiet.
	const retries = useRef(0);
	const retryTimer = useRef<ReturnType<typeof setTimeout>>();

	// Requests read the latest of everything, not what it was at connect time.
	const latest = useRef({ tokens, log, notes });
	latest.current = { tokens, log, notes };

	const editor = useMemo<AgentEditor>(
		() => ({
			layers: () => {
				const state = store?.getState();
				return state ? denormalize(state.nodes, state.rootIds) : [];
			},
			breakpoints: () => store?.getState().breakpoints ?? [],
			frameStyles: () => store?.getState().frameStyles ?? {},
			tokens: () => latest.current.tokens.tokens,
			dimensions: () => latest.current.tokens.dimensions,
			annotations: () => latest.current.notes.annotations,
			changes: () => latest.current.log.entries,
			dispatch: (action, reason, taskId) => {
				store?.dispatchWithMeta(action, { actor: AGENT, reason, taskId });
			},
			rules: () => store?.getState().rules ?? [],
			// Agents are always held to the rules, as the editor role.
			checkRules: (actions) =>
				store ? firstRejection(store.getState(), actions, "editor") : null,
			setTokens: (update, meta) => {
				// The next token edit in the log is the agent's, with its reason.
				latest.current.log.attributeNextTokenEdit({ actor: AGENT, ...meta });
				latest.current.tokens.setTokens(update);
			},
			claim: (id) => latest.current.notes.claim(id, AGENT),
			reply: (id, body) => latest.current.notes.reply(id, body, AGENT),
			resolve: (id) => latest.current.notes.setStatus(id, "resolved"),
		}),
		[store]
	);

	// Set once a server sends a design file: from then on, every change here
	// goes back to it to save.
	const fileBacked = useRef(false);
	const loadDocument = useCallback(
		(doc: DesignDocument) => {
			store?.dispatch({ type: "LOAD_DOCUMENT", payload: doc });
			latest.current.tokens.loadTokens(doc.tokens, doc.tokenDimensions);
			latest.current.notes.replaceAll(doc.annotations);
			latest.current.log.replaceAll(doc.changes);
			fileBacked.current = true;
		},
		[store]
	);

	// Send the design back after changes settle, so the file stays current.
	const { exportDocument } = useDesignerApi();
	const exportRef = useRef(exportDocument);
	exportRef.current = exportDocument;
	const pushTimer = useRef<ReturnType<typeof setTimeout>>();
	const pushDocument = useCallback(() => {
		if (!fileBacked.current) return;
		clearTimeout(pushTimer.current);
		pushTimer.current = setTimeout(() => {
			if (socket.current?.readyState !== WebSocket.OPEN) return;
			socket.current.send(
				JSON.stringify({
					event: "document",
					document: exportRef.current(),
				} satisfies EditorEvent)
			);
		}, 300);
	}, []);
	useEffect(() => store?.subscribe(pushDocument), [store, pushDocument]);
	// biome-ignore lint/correctness/useExhaustiveDependencies: these changing is the signal to save
	useEffect(pushDocument, [
		tokens.tokens,
		tokens.dimensions,
		notes.annotations,
		log.entries,
		pushDocument,
	]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: `attempt` reconnects on request
	useEffect(() => {
		if (!url) return;
		setStatus("connecting");
		const ws = new WebSocket(url);
		socket.current = ws;
		// Requests go to the editor the designer is using: say so on connect
		// when visible, and whenever this tab gets focus or comes back.
		const markActive = () => {
			if (
				ws.readyState === WebSocket.OPEN &&
				document.visibilityState === "visible"
			) {
				ws.send(JSON.stringify({ event: "active" } satisfies EditorEvent));
			}
		};
		window.addEventListener("focus", markActive);
		document.addEventListener("visibilitychange", markActive);
		ws.onopen = () => {
			retries.current = 0;
			setStatus("connected");
			ws.send(
				JSON.stringify({
					event: "hello",
					editor: "design-ui",
				} satisfies EditorEvent)
			);
			markActive();
		};
		ws.onclose = () => {
			if (socket.current === ws) socket.current = null;
			const delay = RETRY_DELAYS[retries.current];
			if (delay === undefined) {
				setStatus("disconnected");
				return;
			}
			retries.current += 1;
			setStatus("connecting");
			retryTimer.current = setTimeout(() => setAttempt((n) => n + 1), delay);
		};
		ws.onmessage = (message) => {
			let request: AgentRequest | ServerEvent;
			try {
				request = JSON.parse(String(message.data));
			} catch {
				return;
			}
			// A server working on a design file: show that design here.
			if ("event" in request) {
				if (request.event === "load_document") loadDocument(request.document);
				return;
			}
			let response: AgentResponse;
			try {
				response = {
					id: request.id,
					ok: true,
					result: handleAgentRequest(request, editor),
				};
			} catch (error) {
				response = {
					id: request.id,
					ok: false,
					error: error instanceof Error ? error.message : String(error),
				};
			}
			ws.send(JSON.stringify(response));
		};
		return () => {
			window.removeEventListener("focus", markActive);
			document.removeEventListener("visibilitychange", markActive);
			clearTimeout(retryTimer.current);
			ws.onclose = null;
			ws.close();
		};
	}, [url, editor, attempt]);

	// Push tasks to the agent as they're assigned to it.
	const announced = useRef(new Set<string>());
	useEffect(() => {
		// Runs again when the agent connects, to send what it missed.
		if (status !== "connected") return;
		for (const a of notes.annotations) {
			const waiting =
				a.kind === "task" &&
				a.status === "open" &&
				a.assignedTo?.kind === "agent" &&
				!a.claimedBy;
			if (!waiting) {
				announced.current.delete(a.id);
				continue;
			}
			if (announced.current.has(a.id)) continue;
			if (socket.current?.readyState === WebSocket.OPEN) {
				announced.current.add(a.id);
				socket.current.send(
					JSON.stringify({
						event: "task_assigned",
						task: taskView(a, editor),
					} satisfies EditorEvent)
				);
			}
		}
	}, [notes.annotations, editor, status]);

	const connect = useCallback(() => {
		if (!url || socket.current?.readyState === WebSocket.OPEN) return;
		retries.current = 0;
		setAttempt((n) => n + 1);
	}, [url]);

	const value = useMemo(
		() => ({ status, url, connect }),
		[status, url, connect]
	);
	return (
		<AgentLinkContext.Provider value={value}>
			{children}
		</AgentLinkContext.Provider>
	);
};

export const useAgentLink = () => useContext(AgentLinkContext);
