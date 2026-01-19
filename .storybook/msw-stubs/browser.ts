// Stub for msw/browser when MSW is not installed
export const setupWorker = () => ({
	start: async () => {},
	stop: async () => {},
	use: () => {},
	resetHandlers: () => {},
	resetWorker: () => {},
	printHandlers: () => {},
	listHandlers: () => [],
	events: {
		on: () => {},
		removeListener: () => {},
	},
});

export default setupWorker;
