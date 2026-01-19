// Stub for msw/core/http when MSW is not installed
export const http = {
	get: () => ({}),
	post: () => ({}),
	put: () => ({}),
	patch: () => ({}),
	delete: () => ({}),
	head: () => ({}),
	options: () => ({}),
};

export default http;
