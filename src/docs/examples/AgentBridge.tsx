import { useEffect, useRef } from "react";
import type { Action } from "../../hooks/useDesigner";
import { useDesignerAction } from "../../hooks/useDesignerAction";
import { useLayers } from "../../hooks/useLayers";

// Render this anywhere inside <Designer>.
export function AgentBridge({ url }: { url: string }) {
	const dispatch = useDesignerAction();
	const layers = useLayers();
	const socket = useRef<WebSocket | null>(null);

	// Actions in: validate them first if the sender isn't yours.
	useEffect(() => {
		const ws = new WebSocket(url);
		socket.current = ws;
		ws.onmessage = (event) => dispatch(JSON.parse(event.data) as Action);
		return () => ws.close();
	}, [url, dispatch]);

	// The document out, after every change.
	useEffect(() => {
		if (socket.current?.readyState === WebSocket.OPEN) {
			socket.current.send(JSON.stringify(layers));
		}
	}, [layers]);

	return null;
}
