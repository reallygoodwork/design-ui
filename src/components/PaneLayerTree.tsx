import { Button } from "@base-ui/react/button";
import { Input } from "@base-ui/react/input";
import { IconLock, IconLockOpen } from "@tabler/icons-react";
import { useRef, useState } from "react";
import { useOnClickOutside } from "usehooks-ts";
import { useDesignerAction } from "../hooks/useDesignerAction";
import { useLayers } from "../hooks/useLayers";
import { useLayerTypes } from "../hooks/useLayerTypes";
import { useSelectedLayers } from "../hooks/useSelectedLayers";
import type { Layer } from "../lib/Types";

export const PaneLayerTreeItem = ({
	layer,
	depth = 0,
}: {
	layer: Layer;
	depth?: number;
}) => {
	const ref = useRef(null);
	const [isEditing, setIsEditing] = useState(false);
	const layerTypes = useLayerTypes();
	const selectedLayers = useSelectedLayers();
	const designerAction = useDesignerAction();

	const handleDoubleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
		e.stopPropagation();
		setIsEditing(true);
	};

	useOnClickOutside(ref, () => {
		setIsEditing(false);
	});

	const handleLayerClick = (
		e: React.MouseEvent<HTMLButtonElement>,
		layerId: string
	) => {
		e.stopPropagation();
		designerAction({
			type: "SELECT_LAYER",
			payload: { layerId, shiftKey: e.shiftKey },
		});
	};

	const handleLayerNameChange = (layerId: string, name: string) => {
		designerAction({
			type: "UPDATE_LAYER_NAME",
			payload: { layerId, name },
		});
	};

	const handleLayerLockChange = (layerId: string, isLocked: boolean) => {
		designerAction({
			type: "UPDATE_LAYER_LOCK",
			payload: { layerId, isLocked },
		});
	};

	return (
		<>
			<div
				key={layer.id}
				data-selected={selectedLayers.some((l) => l.id === layer.id)}
				data-editing={isEditing}
				data-visibility={true}
				className={`group/pane-layer-tree-item relative flex items-center gap-2 data-[visibility=false]:opacity-50`}
				style={{
					paddingLeft: `${depth * 8}px`,
				}}
			>
				<Button
					data-slot="context-menu-trigger"
					type="button"
					className="inline-flex items-center whitespace-nowrap rounded-md text-xs leading-none transition-all focus-visible:outline-1 focus-visible:outline-ring focus-visible:ring-[4px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg:not([class*='size-'])]:size-3.5 [&_svg]:pointer-events-none [&_svg]:shrink-0 hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 h-7 px-2 py-1 has-[>svg]:px-2 w-full flex-1 justify-start gap-2 font-normal active:scale-100 group-hover/pane-layer-tree-item:bg-accent group-hover/pane-layer-tree-item:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground group-data-[selected=true]/pane-layer-tree-item:bg-accent"
					onClick={(e) => handleLayerClick(e, layer.id)}
					onDoubleClick={(e) => handleDoubleClick(e)}
				>
					<span className="size-3.5 shrink-0 text-muted-foreground opacity-80">
						{layerTypes.find((lt) => lt.type === layer.type)?.icon}
					</span>
					<span className="truncate leading-normal group-data-[editing=true]/pane-layer-tree-item:opacity-0">
						{layer.name}
					</span>
				</Button>
				<Input
					data-slot="input"
					value={layer.name}
					className="h-7 min-w-0 rounded-md border border-input bg-input px-2 py-1 text-base outline-none transition-[color,box-shadow] selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:font-medium file:text-foreground file:text-sm placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 sm:text-xs focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 absolute inset-y-0 right-8 left-6 z-10 hidden w-auto group-data-[editing=true]/pane-layer-tree-item:flex"
					onChange={(e) => handleLayerNameChange(layer.id, e.target.value)}
					ref={ref}
				/>
				<Button
					data-slot="button"
					className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md font-medium text-xs leading-none transition-all focus-visible:outline-1 focus-visible:outline-ring focus-visible:ring-[4px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 size-7 justify-center p-0 active:scale-95 [&_svg:not([class*='size-'])]:size-3.5 -translate-y-1/2 absolute top-1/2 right-0 opacity-0 group-hover/pane-layer-tree-item:opacity-100 data-[locked=true]:opacity-100"
					data-locked={layer.isLocked}
					title={layer.isLocked ? "Unlock layer" : "Lock layer"}
					onClick={() =>
						handleLayerLockChange(layer.id, !layer.isLocked || false)
					}
				>
					{layer.isLocked ? <IconLock /> : <IconLockOpen />}
				</Button>
			</div>
			{/* Render nested children */}
			{layer.children &&
				layer.children.length > 0 &&
				layer.children.map((child) => (
					<PaneLayerTreeItem key={child.id} layer={child} depth={depth + 1} />
				))}
		</>
	);
};

export const PaneLayerTree = () => {
	const layers = useLayers();

	return (
		<div className="-m-1 flex flex-col gap-0.5 overflow-y-auto p-1">
			{layers.map((layer) => (
				<PaneLayerTreeItem key={layer.id} layer={layer} />
			))}
		</div>
	);
};
