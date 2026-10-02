/**
 * Sets the `attribute` of an `element` to the specified `value` _if_ the element's attribute
 * did not already have that value. Used to avoid redundantly triggering `MutationObserver`s.
 *
 * @param {HTMLElement} element
 * @param {string} attribute
 * @param {string} value
 * @returns {void}
 */
export function setAttributeFor(element, attribute, value) {
  if (element.getAttribute(attribute) === value) return;
  element.setAttribute(attribute, value);
}

/**
 * Checks if the provided `element` contains **_either_** end of the page's current {@link Selection}.
 * This check can pass even if the page's Selection is {@link Selection.isCollapsed collapsed}.
 * Supports Shadow DOMs only where {@link Selection.getComposedRanges} is supported.
 *
 * **NOTE**: If the page's Selection resides _outside_ the provided `element` (e.g., the selection starts _before_ the
 * `element` and ends _after_ the `element`), this check will return `false` (since the selection does not
 * reside _within_ the `element`).
 * @param {HTMLElement} element
 * @returns {boolean}
 */
export function selectionIsWithin(element) {
  const selection = /** @type {Selection} */ (element.ownerDocument.getSelection());
  if (typeof selection.getComposedRanges === "function") {
    const root = element.getRootNode();
    const shadowRoots = root instanceof ShadowRoot ? [root] : [];

    /** @type {StaticRange | undefined} */
    let range;
    try {
      [range] = selection.getComposedRanges({ shadowRoots });
    } catch {
      // Support Legacy Behavior
      [range] = selection.getComposedRanges(.../** @type {any} */ (shadowRoots));
    }

    return Boolean(range) && (element.contains(range.startContainer) || element.contains(range.endContainer));
  }

  return element.contains(selection.anchorNode) || element.contains(selection.focusNode);
}
