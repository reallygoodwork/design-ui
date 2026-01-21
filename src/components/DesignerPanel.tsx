export const DesignPanel = ({ children }: { children: React.ReactNode }) => {
	return (
		<div
			data-slot="designer-panel"
			className="relative z-20 flex h-full w-[260px] shrink-0 flex-col bg-background first:border-r border-border last:border-l *:[div]:no-scrollbar"
			style={{
				"--designer-panel-height": "48px",
			} as React.CSSProperties}
		>
			<div className="flex flex-1 flex-col overflow-hidden">{children}</div>
		</div>
	);
};
