import type { ReactNode } from "react";

export const DesignerToolbarGroup = ({ children }: { children: ReactNode }) => {
	return <div className="flex items-center">{children}</div>;
};
