import { IconFrame } from "@tabler/icons-react";
import { applyCssVars } from "../cssPropertyMapping";
import type { LayerType, LayerWithStyles } from "../Types";

export const frameLayerType = {
	type: "frame",
	name: "Frame",
	description: "A box that holds and lays out other layers",
	icon: <IconFrame />,
	keybinding: {
		key: "f",
		label: "F",
		labelMac: "F",
		description: "Add frame",
		group: "Layers",
	},
	supportsChildren: true,
	supportedCssProperties: [
		"--width",
		"--height",
		"--max-width",
		"--max-height",
		"--min-width",
		"--min-height",
		"--background-color",
		"--color",
		"--padding-block-start",
		"--padding-block-end",
		"--padding-inline-start",
		"--padding-inline-end",
		"--margin-block-start",
		"--margin-block-end",
		"--margin-inline-start",
		"--margin-inline-end",
		"--border-top-left-radius",
		"--border-top-right-radius",
		"--border-bottom-left-radius",
		"--border-bottom-right-radius",
		"--border-width",
		"--border-style",
		"--border-color",
		"--opacity",
		"--transition-duration",
		"--transition-timing-function",
		"--position",
		"position",
		"top",
		"right",
		"bottom",
		"left",
		"--top",
		"--right",
		"--bottom",
		"--left",
		"--z-index",
		"--display",
		"--flex-direction",
		"--flex-wrap",
		"--grid-template-columns",
		"--grid-template-rows",
		"--align-items",
		"--justify-content",
		"--column-gap",
		"--row-gap",
	],
	defaultValues: {
		name: "Frame",
		value: "Hello World",
		cssVars: {
			"--height": "100px",
			"--background-color": "#ffffff",
		},
	},
	render: (
		layer: LayerWithStyles,
		children?: React.ReactNode,
		elementType = "div"
	) => {
		const Element = elementType as keyof JSX.IntrinsicElements;
		return (
			<Element
				style={applyCssVars(
					layer.effectiveCssVars,
					frameLayerType.supportedCssProperties
				)}
			>
				{children}
			</Element>
		);
	},
	elementType: "div",
	availableElementTypes: [
		"div",
		"section",
		"article",
		"main",
		"header",
		"footer",
		"nav",
		"aside",
	],
	presets: [
		{
			id: "frame",
			label: "Frame",
			description: "A box that holds and lays out other layers",
			group: "Layout",
			keywords: ["div", "box", "container", "group"],
		},
		...(
			[
				[
					"section",
					"Section",
					"A themed part of the page, usually with a heading",
				],
				[
					"header",
					"Header",
					"Introductory content, such as a logo and navigation",
				],
				["nav", "Navigation", "A group of links to other pages or sections"],
				["main", "Main", "The page's primary content. Use one per page"],
				[
					"article",
					"Article",
					"Self-contained content, such as a post or card",
				],
				["aside", "Aside", "Content beside the main flow, such as a sidebar"],
				["footer", "Footer", "Closing content, such as links and copyright"],
			] as const
		).map(([element, label, description]) => ({
			id: element,
			label,
			description,
			group: "Layout",
			elementType: element,
			values: { name: label },
			keywords: [element],
		})),
	],
} satisfies LayerType;
