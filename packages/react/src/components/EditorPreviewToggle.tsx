import { IconEye } from "@tabler/icons-react";
import { useDesignerAction } from "../hooks/useDesignerAction";
import { useDesignerSelector } from "../hooks/useDesignerSelector";
import { cn } from "../lib/cn";

/**
 * For builders: see the editor exactly as an editor will, with the rules
 * applied and the rule controls hidden. Hidden from editors, who already do.
 */
export const EditorPreviewToggle = () => {
	const role = useDesignerSelector((s) => s.role);
	const previewing = useDesignerSelector((s) => s.previewAsEditor);
	const dispatch = useDesignerAction();
	if (role !== "builder") return null;
	return (
		<button
			type="button"
			aria-pressed={previewing}
			title="See what an editor can change"
			onClick={() => dispatch({ type: "SET_PREVIEW", payload: !previewing })}
			className={cn(
				"inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-control text-muted-foreground hover:bg-hover hover:text-foreground",
				previewing &&
					"bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
			)}
		>
			<IconEye className="size-3.5" aria-hidden="true" />
			{previewing ? "Exit editor preview" : "Editor preview"}
		</button>
	);
};
