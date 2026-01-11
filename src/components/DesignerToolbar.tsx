import type { ReactNode } from "react";

export const DesignerToolbar = ({ children }: { children: ReactNode }) => {
	return (
		<div className="-translate-x-1/2 absolute bottom-4 left-1/2 z-50 flex h-10 w-fit items-center gap-2 rounded-xl bg-background px-2 shadow-lg">
			{children}
		</div>
	);
};
