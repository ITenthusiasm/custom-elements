/* eslint no-param-reassign: ["error", { "props": false }] */
/** @typedef {"open" | "closed"} ToggleState */
/** @typedef {"calc(infinity)"} CSSInfinity */
/** @typedef {Extract<FillMode, "forwards" | "backwards" | "both" | "none">} AnimatesAttr */

/** Used internally to track the element which was `toggled` open to reveal the {@link PseudoBackdrop} */
const lastPseudoPopover = Symbol("lastPseudoPopover");

/** Used internally to track the element which the {@link lastPseudoPopover} wanted to elevate alongside itself */
const lastElevatedSibling = Symbol("lastElevatedSibling");

const attrs = Object.freeze({
  "data-open": "data-open",
  "data-backdrop": "data-backdrop",
  "data-elevates": "data-elevates",
});

class PseudoBackdrop extends HTMLElement {
  #internals = this.attachInternals();
  /** @type {Document | ShadowRoot | null} */ #root = null;
  #boundHandleDelegatedToggle = this.#handleDelegatedToggle.bind(this);
  /** @private @type {HTMLElement | null} */ [lastPseudoPopover] = null;
  /** @private @type {HTMLElement | null} */ [lastElevatedSibling] = null;

  constructor() {
    super();
    this.#internals.role = "none";
  }

  /** "On Mount" for Custom Elements @returns {void} */
  connectedCallback() {
    this.role = "none";
    // NOTE: This is actually `Document | ShadowRoot`, but the TS types for events are incomplete; so we used `Document`.
    this.#root = /** @type {Document} */ (this.getRootNode());
    this.#root.addEventListener("toggle", this.#boundHandleDelegatedToggle, true);
  }

  /** "On Unmount" for Custom Elements @returns {void} */
  disconnectedCallback() {
    // NOTE: See note in `connectedCallback()` about `this.#root`'s/getRootNode()`'s TS type
    /** @type {Document} */ (this.#root).removeEventListener("toggle", this.#boundHandleDelegatedToggle, true);
    if (this[lastPseudoPopover]) PseudoBackdrop.#demote(this);
    this.removeAttribute(attrs["data-open"]);
    this.#root = null;
  }

  /**
   * @param {ToggleEvent} event
   * @returns {void}
   */
  #handleDelegatedToggle(event) {
    const { newState, oldState } = /** @type {{ newState: ToggleState, oldState: ToggleState }} */ (event);
    if (newState === oldState) return;

    const pseudoPopover = /** @type {HTMLElement} */ (event.target);
    const backdropId = pseudoPopover.getAttribute(attrs["data-backdrop"]);
    const elevatedId = pseudoPopover.getAttribute(attrs["data-elevates"]);
    if (!backdropId) return;

    const root = /** @type {Document | ShadowRoot} */ (pseudoPopover.getRootNode());
    const backdrop = root.getElementById(backdropId);
    const elevated = elevatedId ? root.getElementById(elevatedId) : null;
    if (backdrop !== this) return;

    if (newState === "open") {
      // If the User rapidly switched to a **different** elevated element, demote the obsolete one first
      const previousPopover = /** @type {PseudoBackdrop} */ (backdrop)[lastPseudoPopover];
      if (previousPopover && previousPopover !== pseudoPopover) PseudoBackdrop.#demote(this);

      /** @type {PseudoBackdrop} */ (backdrop)[lastPseudoPopover] = pseudoPopover;
      /** @type {PseudoBackdrop} */ (backdrop)[lastElevatedSibling] = elevated;

      // NOTE: A previously-tracked popover means the backdrop is visible, so there's no opening transition to wait for
      if (previousPopover || this.animates === "none" || this.animates === "backwards") PseudoBackdrop.#promote(this);
      else backdrop.addEventListener("transitionrun", PseudoBackdrop.#handleTransitionrun, { once: true });
      backdrop.toggleAttribute(attrs["data-open"], true);
    } else {
      if (this.animates === "none" || this.animates === "forwards") PseudoBackdrop.#demote(this);
      else {
        backdrop.addEventListener("transitionend", PseudoBackdrop.#handleTransitionCompletion);
        backdrop.addEventListener("transitioncancel", PseudoBackdrop.#handleTransitionCompletion);
      }

      backdrop.removeAttribute(attrs["data-open"]);
    }
  }

  /**
   * The Event Handler used by the {@link PseudoBackdrop}'s `transitionrun` event when it is **_opened_**.
   * @param {TransitionEvent} event
   * @returns {void}
   */
  static #handleTransitionrun(event) {
    const backdrop = /** @type {PseudoBackdrop} */ (event.target);
    if (!backdrop.getAnimations().length) return;

    PseudoBackdrop.#promote(backdrop);
  }

  /**
   * Promotes the `pseudoPopover` (and the related `elevatedSibling`) associated with the provided {@link backdrop}
   * to a higher Stacking Context by applying a high `z-index` to the elements.
   * @param {PseudoBackdrop} backdrop
   * @returns {void}
   */
  static #promote(backdrop) {
    const pseudoPopover = /** @type {HTMLElement} */ (backdrop[lastPseudoPopover]);
    const elevatedSibling = backdrop[lastElevatedSibling];

    pseudoPopover.style.zIndex = /** @satisfies {CSSInfinity} */ ("calc(infinity)");
    if (elevatedSibling) elevatedSibling.style.zIndex = /** @satisfies {CSSInfinity} */ ("calc(infinity)");
  }

  /**
   * The Event Handler used by the {@link PseudoBackdrop}'s `transitionend` and `transitioncancel` events when it is **_closed_**.
   * @param {TransitionEvent} event
   * @returns {void}
   */
  static #handleTransitionCompletion(event) {
    const backdrop = /** @type {PseudoBackdrop} */ (event.target);
    if (backdrop.getAnimations().length) return; // A future animation will resolve `z-index` correctly

    backdrop.removeEventListener("transitionend", PseudoBackdrop.#handleTransitionCompletion);
    backdrop.removeEventListener("transitioncancel", PseudoBackdrop.#handleTransitionCompletion);
    if (backdrop.hasAttribute(attrs["data-open"])) return; // User re-opened the backdrop before it finished animating out
    if (!backdrop.isConnected) return; // `disconnectedCallback()` already demoted the element

    PseudoBackdrop.#demote(backdrop);
  }

  /**
   * Demotes the `pseudoPopover` (and the related `elevatedSibling`) associated with the provided {@link backdrop}
   * by terminating their Stacking Contexts (via `z-index` removal).
   * @param {PseudoBackdrop} backdrop
   * @returns {void}
   */
  static #demote(backdrop) {
    const pseudoPopover = /** @type {HTMLElement} */ (backdrop[lastPseudoPopover]);
    const elevatedSibling = backdrop[lastElevatedSibling];

    pseudoPopover.style.zIndex = "";
    if (elevatedSibling) elevatedSibling.style.zIndex = "";
    if (elevatedSibling?.getAttribute("style") === "") elevatedSibling.removeAttribute("style");
    if (pseudoPopover.getAttribute("style") === "") pseudoPopover.removeAttribute("style");

    backdrop[lastPseudoPopover] = null;
    backdrop[lastElevatedSibling] = null;
  }

  /**
   * Tells the {@link PseudoBackdrop} how it should **_expect_** to be animated. This setting is required
   * to ensure that the backdrop will always modify the `z-index`es of other elements at the right time.
   *
   * - `both` (default): The backdrop should expect to be animated in both directions.
   * - `forwards`: The backdrop should only expect to be animated while opening.
   * - `backwards`: The backdrop should only expect to be animated while closing.
   * - `none`: The backdrop should never expect to be animated.
   * @returns {AnimatesAttr}
   */
  get animates() {
    const attribute = /** @type {AnimatesAttr | null} */ (this.getAttribute("animates"));
    if (attribute === "forwards" || attribute === "backwards" || attribute === "none") return attribute;
    return "both";
  }

  /** @param {AnimatesAttr | null | undefined} value */
  set animates(value) {
    if (value == null) this.removeAttribute("animates");
    else this.setAttribute("animates", value);
  }
}

export default PseudoBackdrop;
