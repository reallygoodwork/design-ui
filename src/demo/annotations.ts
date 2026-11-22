import type { Annotation } from "@design-ui/core";

const minutesAgo = (minutes: number) =>
	new Date(Date.now() - minutes * 60_000).toISOString();

/** A few annotations of each kind, so the Activity tab has something to show. */
export const demoAnnotations: Annotation[] = [
	{
		id: "ann_demo_title",
		kind: "comment",
		target: { kind: "layer", layerId: "title" },
		body: "Can the title wrap to two lines on mobile instead of three?",
		author: { kind: "user", name: "Sam" },
		at: minutesAgo(42),
		status: "open",
		replies: [
			{
				id: "rep_demo_title",
				author: { kind: "user", name: "You" },
				body: "Trying a smaller display size at mobile.",
				at: minutesAgo(30),
			},
		],
	},
	{
		id: "ann_demo_gutter",
		kind: "decision",
		target: { kind: "token", path: "space.page.inline" },
		body: "96px gutters at desktop, so the measure stays under 75 characters.",
		author: { kind: "user", name: "You" },
		at: minutesAgo(120),
		status: "open",
		replies: [],
	},
	{
		id: "ann_demo_feature",
		kind: "task",
		target: { kind: "layer", layerId: "swatch", property: "--height" },
		body: "Make the feature block 16:9 instead of a fixed height.",
		author: { kind: "user", name: "Sam" },
		at: minutesAgo(15),
		status: "open",
		replies: [],
	},
];
