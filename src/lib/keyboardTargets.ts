/** True when typing here should stay in the field. */
export const isEditableTarget = (target: EventTarget | null) =>
	target instanceof HTMLElement &&
	(target.tagName === "INPUT" ||
		target.tagName === "TEXTAREA" ||
		target.isContentEditable);

/**
 * True when the focused element owns its keys, like a toggle or select.
 * Tree rows are not controls, so Delete still removes the focused layer.
 */
export const isControlTarget = (target: EventTarget | null) =>
	target instanceof Element &&
	Boolean(
		target.closest(
			"input, textarea, select, button, a[href], [contenteditable], [role=combobox], [role=listbox], [role=menu], [role=dialog]"
		)
	);

export const isInLayerTree = (target: EventTarget | null) =>
	target instanceof Element && Boolean(target.closest("[role=treegrid]"));

export const isPopupOpen = () =>
	Boolean(document.querySelector("[role=dialog], [role=listbox], [role=menu]"));
