import type { LayerType } from "../lib/Types";
import { useDesignerSelector } from "./useDesignerSelector";

/**
 * The registered layer types. Core stores them as definitions; the editor
 * only ever registers full layer types (`Designer` and `DesignerProvider`
 * take `LayerType[]`), so they carry a renderer and an icon.
 */
export const useLayerTypes = () =>
	useDesignerSelector((state) => state.layerTypes) as LayerType[];
