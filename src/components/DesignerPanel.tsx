import type { ReactNode } from "react";

export const DesignerPanel = ({ children }: { children: ReactNode }) => {
	return (
		<div data-slot="designer-panel" className="group flex flex-col gap-2 py-4 last:border-b-0 has-data-[slot=designer-pane-header]:gap-4 flex-1 border-b-0">
			{children}
		</div>
	);
};
