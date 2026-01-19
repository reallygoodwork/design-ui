export const DesignPanel = ({ children }: { children: React.ReactNode }) => {
	return (
		<div
			data-slot="designer-panel"
			className="relative z-20 flex h-full w-[260px] shrink-0 flex-col bg-background first:border-r last:border-l *:[div]:no-scrollbar"
		>
			<div className="flex flex-1 flex-col overflow-y-auto">{children}</div>
		</div>
	);
};
