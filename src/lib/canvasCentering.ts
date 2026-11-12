/** A rectangle in canvas units (unzoomed design pixels). */
export type Box = { x: number; y: number; width: number; height: number };

/**
 * Where to scroll so `box` sits in the middle of `view`. Both are in canvas
 * units; the result is the canvas point for the view's top-left corner.
 */
export const centeredScroll = (
	box: Box,
	view: { width: number; height: number }
) => ({
	x: box.x + box.width / 2 - view.width / 2,
	y: box.y + box.height / 2 - view.height / 2,
});

/**
 * Whether clicking off a layer should glide the artboards back to the middle.
 *
 * `view` is the visible part of the canvas and `artboards` the box around
 * every artboard, both in canvas units, so the result doesn't depend on zoom.
 *
 * Called on every click on empty canvas, so returning true too eagerly will
 * yank people away from an area they panned to on purpose; too rarely and the
 * artboards drift off and stay lost.
 */
export const shouldRecenter = (view: Box, artboards: Box): boolean => {
	const area = artboards.width * artboards.height;
	if (area <= 0) return false;
	// The part of the artboards inside the view.
	const visibleWidth = Math.max(
		0,
		Math.min(view.x + view.width, artboards.x + artboards.width) -
			Math.max(view.x, artboards.x)
	);
	const visibleHeight = Math.max(
		0,
		Math.min(view.y + view.height, artboards.y + artboards.height) -
			Math.max(view.y, artboards.y)
	);
	const visible = visibleWidth * visibleHeight;
	// Lost means less than half the artboards is on screen. Zoomed in, only a
	// sliver can ever show, so artboards filling half the screen count as found.
	const viewArea = view.width * view.height;
	const fillsView = viewArea > 0 && visible / viewArea >= 0.5;
	return visible / area < 0.5 && !fillsView;
};
