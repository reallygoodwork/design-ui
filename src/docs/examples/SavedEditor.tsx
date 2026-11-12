import type { ReactNode } from "react";
import { Designer } from "../../components/Designer";
import type { Layer } from "../../lib/Types";

const saved = localStorage.getItem("design");
const defaultLayers: Layer[] = saved ? JSON.parse(saved) : [];

// Keep this outside the component so it isn't a new function on every render.
const save = (layers: Layer[]) =>
	localStorage.setItem("design", JSON.stringify(layers));

export const SavedEditor = ({ children }: { children: ReactNode }) => (
	<Designer defaultLayers={defaultLayers} onLayersChange={save}>
		{children}
	</Designer>
);
