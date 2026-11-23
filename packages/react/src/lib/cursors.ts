/**
 * The canvas's own cursors: an arrow for empty space, and the same arrow with
 * a small badge over anything a click would select. The badge says what kind
 * of layer it is: selection corners for a frame, a T for text, a picture for
 * an image, a field for an input. Each is a CSS `cursor` value with the
 * system cursor as a fallback.
 *
 * Colours are literal, because a data URL can't read CSS variables: the
 * editor's foreground (#1b1e26) with a white edge, so the arrow reads on light
 * and dark content, and the accent (#2b7fff) for every badge.
 */

const ARROW =
	'<path d="M5 3.2 L5 18.6 Q5 19.6 5.9 19 L9.6 15.9 L12.1 21.2 Q12.4 21.8 13 21.6 L14.9 20.8 Q15.5 20.5 15.2 19.9 L12.8 14.7 L17.6 14.4 Q18.6 14.3 17.9 13.6 L6.1 2.6 Q5 1.8 5 3.2 Z" fill="#1b1e26" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/>';

/**
 * A badge drawn twice: a wide white stroke as a halo so it reads over any
 * content, then the accent stroke on top. Badges sit in the bottom-right
 * corner, clear of the arrow's tail: the cursor is 28px so they have room.
 */
const badge = (shapes: string) =>
	`<g fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round">${shapes}</g><g fill="none" stroke="#2b7fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${shapes}</g>`;

/** Two opposite corners of a selection box. */
const CORNERS = badge(
	'<path d="M17.5 19.5v-2.2q0-.8.8-.8h2.2M24.5 21.5v2.2q0 .8-.8.8h-2.2"/>'
);

/** A capital T. */
const TEXT = badge('<path d="M17.5 17.5h6.6M20.8 17.5v7"/>');

/** A picture: a frame with a hill and a sun. */
const IMAGE = badge(
	'<rect x="17" y="17.4" width="7.8" height="6.8" rx="1.4"/><path d="M17.4 23.6l2.4-2.4 2.4 2.4M22.6 19.8h.01"/>'
);

/** A text field with a caret. */
const INPUT = badge(
	'<rect x="16.6" y="18" width="8.8" height="5.8" rx="1.4"/><path d="M19.2 19.6v2.6"/>'
);

const svgCursor = (body: string, fallback: string) =>
	`url("data:image/svg+xml,${encodeURIComponent(
		`<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">${body}</svg>`
	)}") 5 3, ${fallback}`;

/** Empty canvas and frame background. */
export const CURSOR_ARROW = svgCursor(ARROW, "default");

/** Over a layer of a type with no badge of its own, such as a host's custom type. */
export const CURSOR_SELECT = svgCursor(ARROW + CORNERS, "pointer");

/** Over a layer of a built-in type: a click selects it, and the badge names it. */
export const CURSOR_SELECT_BY_TYPE: Record<string, string> = {
	frame: CURSOR_SELECT,
	text: svgCursor(ARROW + TEXT, "pointer"),
	image: svgCursor(ARROW + IMAGE, "pointer"),
	input: svgCursor(ARROW + INPUT, "pointer"),
};
