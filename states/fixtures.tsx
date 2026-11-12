import type { ComponentType } from "react";
import { ActionBackgroundColor } from "../src/components/actions/ActionBackgroundColor";
import { ActionBorder } from "../src/components/actions/ActionBorder";
import { ActionBorderRadius } from "../src/components/actions/ActionBorderRadius";
import { ActionElementType } from "../src/components/actions/ActionElementType";
import { ActionFontSize } from "../src/components/actions/ActionFontSize";
import { ActionLayout } from "../src/components/actions/ActionLayout";
import { ActionOpacity } from "../src/components/actions/ActionOpacity";
import { ActionPosition } from "../src/components/actions/ActionPosition";
import { ActionTextAlign } from "../src/components/actions/ActionTextAlign";
import { ActionTextShadow } from "../src/components/actions/ActionTextShadow";
import { ActionTransition } from "../src/components/actions/ActionTransition";
import type { Breakpoint } from "../src/lib/Types";

type Vars = Record<string, string>;

export type InputState = {
	id: string;
	label: string;
	group: string;
	/** Pane title, as in the production inspector */
	pane: string;
	controls: ComponentType[];
	layerType?: "frame" | "text";
	cssVars?: Vars;
	breakpointCssVars?: Record<string, Vars>;
	/** Which breakpoint the inspector is editing */
	breakpoint?: "mobile" | "tablet" | "desktop";
};

export const breakpoints: Breakpoint[] = [
	{
		id: "mobile",
		name: "Mobile",
		width: 375,
		height: 667,
		position: { x: 0, y: 0 },
	},
	{
		id: "tablet",
		name: "Tablet",
		width: 768,
		height: 1024,
		position: { x: 425, y: 0 },
	},
	{
		id: "desktop",
		name: "Desktop",
		width: 1440,
		height: 900,
		position: { x: 1243, y: 0 },
	},
];

const transition = (
	config: object,
	duration: string,
	timing: string
): Vars => ({
	"--transition-config": JSON.stringify(config),
	"--transition-duration": duration,
	"--transition-timing-function": timing,
});

const num = {
	group: "Number field",
	pane: "Typography",
	controls: [ActionFontSize, ActionOpacity],
	layerType: "text" as const,
};
const box = { group: "Box model", pane: "Layout", controls: [ActionLayout] };
const layout = { group: "Layout", pane: "Layout", controls: [ActionLayout] };
const select = {
	group: "Select and toggle",
	pane: "Layer",
	controls: [ActionElementType, ActionTextAlign],
	layerType: "text" as const,
};
const color = {
	group: "Color",
	pane: "Color",
	controls: [ActionBackgroundColor, ActionBorder],
};
const radius = {
	group: "Linked values",
	pane: "Layer",
	controls: [ActionBorderRadius],
};
const motion = {
	group: "Transition",
	pane: "Motion",
	controls: [ActionTransition],
};
const popover = {
	group: "Popover rows",
	pane: "Layer",
	controls: [ActionPosition, ActionTextShadow],
	layerType: "text" as const,
};

export const STATES: InputState[] = [
	// Number field
	{ ...num, id: "number-unset", label: "Unset" },
	{
		...num,
		id: "number-set",
		label: "Set here",
		cssVars: { "--font-size": "18px", "--opacity": "0.85" },
	},
	{
		...num,
		id: "number-rem",
		label: "Other unit (rem)",
		cssVars: { "--font-size": "1.125rem" },
	},
	{
		...num,
		id: "number-raw",
		label: "Raw CSS",
		cssVars: { "--font-size": "clamp(2rem, 5vw, 7.5rem)" },
	},
	{
		...num,
		id: "number-inherited",
		label: "Inherited at Tablet",
		breakpoint: "tablet",
		cssVars: { "--font-size": "18px", "--opacity": "0.85" },
	},
	{
		...num,
		id: "number-override",
		label: "Override at Tablet",
		breakpoint: "tablet",
		cssVars: { "--font-size": "18px", "--opacity": "0.85" },
		breakpointCssVars: {
			tablet: { "--font-size": "28px", "--opacity": "0.5" },
		},
	},
	{
		...num,
		id: "number-max",
		label: "At max",
		cssVars: { "--font-size": "9999px", "--opacity": "1" },
	},

	// Size and box model
	{ ...box, id: "box-empty", label: "Empty" },
	{
		...box,
		id: "box-uniform",
		label: "Uniform padding",
		cssVars: {
			"--padding-block-start": "24px",
			"--padding-block-end": "24px",
			"--padding-inline-start": "24px",
			"--padding-inline-end": "24px",
		},
	},
	{
		...box,
		id: "box-mixed-units",
		label: "Mixed units",
		cssVars: {
			"--padding-block-start": "2.5rem",
			"--padding-inline-end": "12.75vw",
			"--padding-block-end": "128px",
			"--margin-block-start": "-24px",
		},
	},
	{
		...box,
		id: "box-margin-auto",
		label: "Margin auto",
		cssVars: {
			"--margin-inline-start": "auto",
			"--margin-inline-end": "auto",
			"--max-width": "1440px",
		},
	},
	{
		...box,
		id: "box-inherited",
		label: "Inherited at Tablet",
		breakpoint: "tablet",
		cssVars: {
			"--padding-block-start": "40px",
			"--padding-inline-start": "24px",
			"--padding-inline-end": "24px",
			"--padding-block-end": "40px",
		},
	},
	{
		...box,
		id: "box-override",
		label: "Override at Tablet",
		breakpoint: "tablet",
		cssVars: {
			"--padding-block-start": "40px",
			"--padding-inline-start": "24px",
			"--padding-inline-end": "24px",
			"--padding-block-end": "40px",
		},
		breakpointCssVars: {
			tablet: {
				"--padding-block-start": "96px",
				"--padding-inline-start": "64px",
			},
		},
	},
	{
		...box,
		id: "size-fill-hug",
		label: "Size: Fill and Hug",
		cssVars: { "--width": "100%", "--height": "fit-content" },
	},
	{
		...box,
		id: "size-raw",
		label: "Size: raw CSS",
		cssVars: { "--width": "calc(100% - 48px)", "--min-height": "100vh" },
	},

	// Layout
	{ ...layout, id: "layout-default", label: "Default" },
	{
		...layout,
		id: "layout-row",
		label: "Row",
		cssVars: {
			"--display": "flex",
			"--flex-direction": "row",
			"--column-gap": "16px",
			"--align-items": "center",
		},
	},
	{
		...layout,
		id: "layout-column",
		label: "Column",
		cssVars: {
			"--display": "flex",
			"--flex-direction": "column",
			"--row-gap": "24px",
		},
	},
	{
		...layout,
		id: "layout-grid",
		label: "Grid",
		cssVars: {
			"--display": "grid",
			"--grid-template-columns": "repeat(3, minmax(0, 1fr))",
			"--row-gap": "16px",
			"--column-gap": "16px",
		},
	},
	{
		...layout,
		id: "layout-gap-auto",
		label: "Gap Auto",
		cssVars: {
			"--display": "flex",
			"--flex-direction": "row",
			"--justify-content": "space-between",
		},
	},
	{
		...layout,
		id: "layout-wrap",
		label: "Row with wrap",
		cssVars: {
			"--display": "flex",
			"--flex-direction": "row",
			"--flex-wrap": "wrap",
			"--column-gap": "0.5rem",
		},
	},
	{
		...layout,
		id: "layout-inherited",
		label: "Inherited at Tablet",
		breakpoint: "tablet",
		cssVars: {
			"--display": "flex",
			"--flex-direction": "column",
			"--row-gap": "24px",
		},
	},
	{
		...layout,
		id: "layout-override",
		label: "Override at Tablet",
		breakpoint: "tablet",
		cssVars: {
			"--display": "flex",
			"--flex-direction": "column",
			"--row-gap": "24px",
		},
		breakpointCssVars: {
			tablet: { "--flex-direction": "row", "--column-gap": "32px" },
		},
	},

	// Select and toggle
	{ ...select, id: "select-default", label: "Default" },
	{
		...select,
		id: "select-set",
		label: "Set here",
		cssVars: { "--text-align": "center" },
	},
	{
		...select,
		id: "select-inherited",
		label: "Inherited at Tablet",
		breakpoint: "tablet",
		cssVars: { "--text-align": "center" },
	},
	{
		...select,
		id: "select-override",
		label: "Override at Tablet",
		breakpoint: "tablet",
		cssVars: { "--text-align": "center" },
		breakpointCssVars: { tablet: { "--text-align": "right" } },
	},

	// Color
	{ ...color, id: "color-unset", label: "Unset" },
	{
		...color,
		id: "color-hex",
		label: "Hex",
		cssVars: {
			"--background-color": "#155dfc",
			"--border-color": "#e4e4e7",
			"--border-width": "1px",
			"--border-style": "solid",
		},
	},
	{
		...color,
		id: "color-oklch-alpha",
		label: "OKLCH with alpha",
		cssVars: { "--background-color": "oklch(0.7123 0.1592 293.54 / 0.5)" },
	},
	{
		...color,
		id: "color-p3",
		label: "Display P3",
		cssVars: {
			"--background-color": "color(display-p3 0.98765 0.12345 0.45678 / 0.875)",
		},
	},
	{
		...color,
		id: "color-inherited",
		label: "Inherited at Tablet",
		breakpoint: "tablet",
		cssVars: { "--background-color": "#155dfc" },
	},

	// Linked values
	{ ...radius, id: "radius-unset", label: "Unset" },
	{
		...radius,
		id: "radius-uniform",
		label: "Uniform",
		cssVars: {
			"--border-top-left-radius": "12px",
			"--border-top-right-radius": "12px",
			"--border-bottom-right-radius": "12px",
			"--border-bottom-left-radius": "12px",
		},
	},
	{
		...radius,
		id: "radius-mixed",
		label: "Mixed corners",
		cssVars: {
			"--border-top-left-radius": "9999px",
			"--border-bottom-right-radius": "12.5%",
		},
	},
	{
		...radius,
		id: "radius-inherited",
		label: "Inherited at Tablet",
		breakpoint: "tablet",
		cssVars: {
			"--border-top-left-radius": "12px",
			"--border-top-right-radius": "12px",
			"--border-bottom-right-radius": "12px",
			"--border-bottom-left-radius": "12px",
		},
	},

	// Transition
	{ ...motion, id: "transition-unset", label: "Unset" },
	{
		...motion,
		id: "transition-easing",
		label: "Easing",
		cssVars: transition(
			{ type: "easing", duration: 0.3, ease: [0.23, 1, 0.32, 1] },
			"0.3s",
			"cubic-bezier(0.23, 1, 0.32, 1)"
		),
	},
	{
		...motion,
		id: "transition-time",
		label: "Time (spring)",
		cssVars: transition(
			{ type: "time", visualDuration: 0.4, bounce: 0.25 },
			"0.6s",
			"ease-out"
		),
	},
	{
		...motion,
		id: "transition-physics",
		label: "Physics",
		cssVars: transition(
			{ type: "physics", stiffness: 300, damping: 18, mass: 1 },
			"0.8s",
			"ease-out"
		),
	},
	{
		...motion,
		id: "transition-raw",
		label: "Hand-written CSS",
		cssVars: {
			"--transition-duration": "0.812s",
			"--transition-timing-function": "cubic-bezier(0.25, 0.1, 0.25, 1)",
		},
	},

	// Popover rows
	{ ...popover, id: "popover-unset", label: "Unset" },
	{
		...popover,
		id: "popover-set",
		label: "Set here",
		cssVars: {
			position: "absolute",
			top: "12px",
			left: "-8px",
			"--text-shadow-offset-x": "12.5px",
			"--text-shadow-offset-y": "-4px",
			"--text-shadow-blur-radius": "48px",
			"--text-shadow-color": "rgb(0 0 0 / 0.25)",
		},
	},
];
