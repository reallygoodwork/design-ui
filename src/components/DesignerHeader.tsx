export const DesignerHeader = ({ children = null }: { children?: React.ReactNode }) => {
  return (
    <div className="flex h-12 w-full shrink-0 items-center gap-2 border-b bg-background px-4">
      {children}
    </div>
  );
};
