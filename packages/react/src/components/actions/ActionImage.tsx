import { useContext } from "react";
import { AllowedContext } from "../../hooks/useAllowed";
import { useDesignerAction } from "../../hooks/useDesignerAction";
import { useSelectedLayers } from "../../hooks/useSelectedLayers";
import { DesignAction } from "../DesignAction";

/** The image's source. Every artboard shows the same image. */
export const ActionImage = () => {
	const [selectedLayer] = useSelectedLayers();
	const designerAction = useDesignerAction();
	const { content } = useContext(AllowedContext);

	if (selectedLayer?.type !== "image") return null;

	return (
		<DesignAction label="Image URL" orientation="vertical">
			<input
				type="url"
				inputMode="url"
				spellCheck={false}
				aria-label="Image URL"
				className="flex h-7 w-full min-w-0 rounded-md border border-input bg-input px-2 py-1 font-mono text-value outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:text-base dark:bg-input/30"
				placeholder="https://example.com/photo.jpg"
				readOnly={!content}
				title={content ? undefined : "The editing rules lock this image"}
				value={selectedLayer.value}
				onChange={(e) =>
					designerAction({
						type: "UPDATE_LAYER_VALUE",
						payload: { id: selectedLayer.id, value: e.target.value },
					})
				}
			/>
		</DesignAction>
	);
};
