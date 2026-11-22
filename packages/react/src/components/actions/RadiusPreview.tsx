import { Fragment } from "react";
import { parseValue } from "../common/UnitField";

const WIDTH = 160;
const HEIGHT = 88;
const ROOT_FONT_SIZE = 16;
const LABEL_SIZE = 20;
// Keeps a large corner's label from drifting away or colliding with another.
const MAX_LABEL_CENTER = 30;

const toPixels = (value: string | undefined) => {
	const parsed = parseValue(value);
	if (!parsed) return 0;
	if (parsed.unit === "rem" || parsed.unit === "em") {
		return parsed.value * ROOT_FONT_SIZE;
	}
	if (parsed.unit === "%") {
		return (parsed.value / 100) * Math.min(WIDTH, HEIGHT);
	}
	return parsed.value;
};

/**
 * Corner radii in the preview, in the order top left, top right, bottom left,
 * bottom right. Shrinks them the way CSS does when neighbors would overlap.
 */
export const previewRadii = (values: (string | undefined)[]) => {
	const [tl, tr, bl, br] = values.map(toPixels);
	const scale = Math.min(
		1,
		WIDTH / (tl + tr || 1),
		WIDTH / (bl + br || 1),
		HEIGHT / (tl + bl || 1),
		HEIGHT / (tr + br || 1)
	);
	return [tl, tr, bl, br].map((radius) => radius * scale);
};

const CORNERS = [
	{ y: "top", x: "left" },
	{ y: "top", x: "right" },
	{ y: "bottom", x: "left" },
	{ y: "bottom", x: "right" },
] as const;

const label = (value: string | undefined) => {
	const parsed = parseValue(value);
	if (!parsed) return "0";
	return parsed.unit === "px" || !parsed.unit
		? `${parsed.value}`
		: `${parsed.value}${parsed.unit}`;
};

/** The layer's corners on a sample shape, with each radius marked. */
export const RadiusPreview = ({
	values,
}: {
	values: (string | undefined)[];
}) => {
	const radii = previewRadii(values);
	const [tl, tr, bl, br] = radii;

	return (
		<div
			aria-hidden="true"
			className="grid h-32 place-items-center rounded-md bg-input"
		>
			<div
				className="relative overflow-hidden border border-accent bg-background"
				style={{
					width: WIDTH,
					height: HEIGHT,
					borderRadius: `${tl}px ${tr}px ${br}px ${bl}px`,
				}}
			>
				{CORNERS.map(({ x, y }, index) => {
					const radius = radii[index];
					const center = Math.min(
						Math.max(radius, LABEL_SIZE / 2),
						MAX_LABEL_CENTER
					);
					const labelOffset = center - LABEL_SIZE / 2;
					return (
						<Fragment key={`${y}-${x}`}>
							{radius > 0 && (
								<span
									className="absolute rounded-full bg-accent/15"
									style={{
										[y]: 0,
										[x]: 0,
										width: radius * 2,
										height: radius * 2,
									}}
								/>
							)}
							<span
								className="absolute grid place-items-center whitespace-nowrap font-mono text-accent-text text-value"
								style={{
									[y]: labelOffset,
									[x]: labelOffset,
									minWidth: LABEL_SIZE,
									height: LABEL_SIZE,
								}}
							>
								{label(values[index])}
							</span>
						</Fragment>
					);
				})}
			</div>
		</div>
	);
};
