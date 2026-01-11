import type { ReactNode } from "react";

export const DesignerContent = ({ children }: { children: ReactNode }) => {
  return (
    <div data-slot="designer-content" className="flex flex-1 overflow-hidden">
      {children}
    </div>
  );
};
