/**
 * The canvas's own cursors: an arrow for empty space, and the same arrow with
 * a small selection bracket over anything a click would select. Each is a CSS
 * `cursor` value with the system cursor as a fallback.
 *
 * Colours are literal, because a data URL can't read CSS variables: the
 * editor's foreground (#1b1e26) with a white edge, so the arrow reads on light
 * and dark content, and the accent (#2b7fff) for the bracket.
 */

const ARROW =
	'<path d="M5 3.2 L5 18.6 Q5 19.6 5.9 19 L9.6 15.9 L12.1 21.2 Q12.4 21.8 13 21.6 L14.9 20.8 Q15.5 20.5 15.2 19.9 L12.8 14.7 L17.6 14.4 Q18.6 14.3 17.9 13.6 L6.1 2.6 Q5 1.8 5 3.2 Z" fill="#1b1e26" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/>';

/** Two opposite corners of a selection box, beside the arrow's tail. */
const BRACKET_PATH =
	"M15.5 17.5v-2.2q0-.8.8-.8h2.2M22.5 19.5v2.2q0 .8-.8.8h-2.2";
const BRACKET = `<path d="${BRACKET_PATH}" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/><path d="${BRACKET_PATH}" fill="none" stroke="#2b7fff" stroke-width="1.6" stroke-linecap="round"/>`;

const svgCursor = (body: string, fallback: string) =>
	`url("data:image/svg+xml,${encodeURIComponent(
		`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">${body}</svg>`
	)}") 5 3, ${fallback}`;

/** Empty canvas and frame background. */
export const CURSOR_ARROW = svgCursor(ARROW, "default");

/** Over a layer: a click selects it. */
export const CURSOR_SELECT = svgCursor(ARROW + BRACKET, "pointer");
