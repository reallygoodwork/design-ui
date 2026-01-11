export const DesignPane = ({ children }: { children: React.ReactNode }) => {
  return (
    <div
      data-slot="designer-pane"
      className="group flex flex-col gap-2 py-4 last:border-b-0 has-data-[slot=designer-pane-header]:gap-4 flex-1 border-b-0"
    >
      {children}
    </div>
  );
};

export const DesignPaneTitle = ({ children }: { children: React.ReactNode }) => {
  return (
    <div
      data-slot="designer-pane-title"
      className="flex h-7 items-center px-4 font-medium text-xs"
    >
      {children}
    </div>
  );
};

export const DesignPaneContent = ({ children }: { children: React.ReactNode }) => {
  return (
    <div
      data-slot="designer-pane-content"
      className="grid gap-3 px-4"
    >
      {children}
    </div>
  );
};