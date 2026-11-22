import { IconLock } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useDesignerSelector } from "../hooks/useDesignerSelector";

const SHOW_FOR = 4000;

/**
 * Says why the last change didn't happen when the editing rules blocked it,
 * from a shortcut, the palette or anywhere else. Announced politely.
 */
export const RuleNotice = () => {
	const rejection = useDesignerSelector((s) => s.rejection);
	const [shown, setShown] = useState<typeof rejection>(null);

	useEffect(() => {
		if (!rejection) return;
		setShown(rejection);
		const timer = setTimeout(() => setShown(null), SHOW_FOR);
		return () => clearTimeout(timer);
	}, [rejection]);

	return (
		<div
			role="status"
			className="pointer-events-none absolute bottom-16 left-1/2 z-20 w-max max-w-[calc(100%-32px)] -translate-x-1/2"
		>
			{shown && (
				<p className="ds-surface flex items-start gap-2 px-3 py-2 text-control">
					<IconLock
						aria-hidden="true"
						className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
					/>
					<span>
						{shown.message}
						<span className="block text-caption text-muted-foreground">
							Locked by the rule “{shown.ruleId}”
						</span>
					</span>
				</p>
			)}
		</div>
	);
};
