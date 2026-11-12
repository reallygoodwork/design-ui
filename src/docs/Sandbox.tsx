import { Fragment, type ReactNode, useEffect } from "react";
import { DesignerProvider } from "../context/DesignerContext";
import { useDesignerAction } from "../hooks/useDesignerAction";
import { useDesignerSelector } from "../hooks/useDesignerSelector";
import { useLayers } from "../hooks/useLayers";
import { useLayerTypes } from "../hooks/useLayerTypes";
import { useSelectedLayers } from "../hooks/useSelectedLayers";
import { getEffectiveStyles } from "../lib/breakpointUtils";
import { cn } from "../lib/cn";
import { frameLayerType } from "../lib/layers/frame";
import { imageLayerType } from "../lib/layers/image";
import { textLayerType } from "../lib/layers/text";
import type { Breakpoint, Layer, LayerType } from "../lib/Types";
import { Code } from "./Code";

const builtInLayerTypes: LayerType[] = [
	textLayerType,
	imageLayerType,
	frameLayerType,
];

const singleBreakpoint: Breakpoint[] = [
	{
		id: "base",
		name: "Base",
		width: 640,
		height: 400,
		position: { x: 0, y: 0 },
	},
];

const SelectOnMount = ({ id }: { id: string }) => {
	const dispatch = useDesignerAction();
	useEffect(() => {
		dispatch({
			type: "SELECT_LAYER",
			payload: { layerId: id, shiftKey: false },
		});
	}, [dispatch, id]);
	return null;
};

/**
 * A real designer store with no canvas: the docs embeds put real controls
 * on it without the page-wide key and wheel handling of `DesignerCanvas`.
 */
export const Sandbox = ({
	layers,
	selectedId,
	layerTypes = [],
	breakpoints = singleBreakpoint,
	children,
}: {
	layers: Layer[];
	selectedId: string;
	layerTypes?: LayerType[];
	breakpoints?: Breakpoint[];
	children: ReactNode;
}) => (
	<DesignerProvider
		defaultLayers={layers}
		defaultLayerTypes={[...builtInLayerTypes, ...layerTypes]}
		breakpoints={breakpoints}
	>
		<SelectOnMount id={selectedId} />
		{children}
	</DesignerProvider>
);

/** Renders the layer tree through each layer type's own `render`. */
export const LayerStage = ({ className }: { className?: string }) => {
	const layers = useLayers();
	const layerTypes = useLayerTypes();
	const breakpoints = useDesignerSelector((state) => state.breakpoints);
	const activeId = useDesignerSelector((state) => state.activeBreakpointId);

	const renderLayer = (layer: Layer): ReactNode => {
		const layerType = layerTypes.find((type) => type.type === layer.type);
		if (!layerType) return null;
		const effectiveCssVars = activeId
			? getEffectiveStyles(layer, activeId, breakpoints)
			: { ...layer.cssVars };
		return (
			<Fragment key={layer.id}>
				{layerType.render(
					{ ...layer, style: {}, effectiveCssVars },
					layer.children?.map(renderLayer),
					layer.elementType ?? layerType.elementType
				)}
			</Fragment>
		);
	};

	return <div className={className}>{layers.map(renderLayer)}</div>;
};

/** The selected layer as stored, updating as the controls are used. */
export const LiveJson = ({
	className,
	watch,
}: {
	className?: string;
	/** Show only these style keys: what the control on screen writes. */
	watch?: string[];
}) => {
	const [layer] = useSelectedLayers();
	if (!layer) return null;
	const { id, type, value, cssVars, breakpointCssVars } = layer;
	const shown = watch
		? {
				id,
				cssVars: Object.fromEntries(
					watch.flatMap((key) => (cssVars?.[key] ? [[key, cssVars[key]]] : []))
				),
			}
		: {
				id,
				type,
				...(value && { value }),
				cssVars,
				...(breakpointCssVars && { breakpointCssVars }),
			};
	return (
		<Code
			code={JSON.stringify(shown, null, 2)}
			copy={false}
			className={className}
		/>
	);
};

/** Real controls beside a live preview and the JSON they write. */
export const ControlDemo = ({
	layers,
	selectedId,
	layerTypes,
	watch,
	children,
}: {
	layers: Layer[];
	selectedId: string;
	layerTypes?: LayerType[];
	watch: string[];
	children: ReactNode;
}) => (
	<Sandbox layers={layers} selectedId={selectedId} layerTypes={layerTypes}>
		<div className="grid overflow-hidden rounded-lg border border-border md:grid-cols-[minmax(0,1fr)_260px]">
			<div className="grid min-h-44 min-w-0 place-items-center bg-muted p-6">
				<LayerStage className="w-full" />
			</div>
			<div className="grid content-center gap-3 border-border border-t bg-background p-4 md:border-t-0 md:border-l">
				{children}
			</div>
		</div>
		<LiveJson className="mt-2" watch={watch} />
	</Sandbox>
);

export const SegmentedButtons = <T extends string>({
	label,
	options,
	value,
	onChange,
	className,
}: {
	label: string;
	options: { label: string; value: T }[];
	value: T | null;
	onChange: (value: T) => void;
	className?: string;
}) => (
	<fieldset className={cn("flex gap-1 rounded-md bg-input p-1", className)}>
		<legend className="sr-only">{label}</legend>
		{options.map((option) => (
			<button
				key={option.value}
				type="button"
				aria-pressed={option.value === value}
				className="rounded-sm px-3 py-1 text-xs hover:bg-background/50 aria-pressed:bg-background aria-pressed:font-medium"
				onClick={() => onChange(option.value)}
			>
				{option.label}
			</button>
		))}
	</fieldset>
);
