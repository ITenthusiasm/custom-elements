import { setAttributeFor } from "../utils/dom.js";

/** Used internally to track the `menuitem` which should **_initally_** receive focus when its owning `menu` is opened */
const startingActivedescendant = Symbol("startingActivedescendant");

/** Used internally to represent the temporary search string used for `menu`s */
const searchString = Symbol("searchString");

/** Used internally to represent the `id` of the latest timeout function that will clear the {@link searchString} */
const searchTimeout = Symbol("searchTimeout");

const attrs = Object.freeze({
  "aria-expanded": "aria-expanded",
  "data-pointerdown": "data-pointerdown",
  "data-open": "data-open",
});

/**
 * An element which satisfies the accessibility requirements of an ARIA `menu`. Does not support submenus.
 *
 * @see {@link https://w3c.github.io/aria/#menu}
 * @see {@link https://www.w3.org/WAI/ARIA/apg/patterns/menubar/}
 * @see {@link https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/}
 */
class MenuElement extends HTMLElement {
  /** @readonly */ #internals = this.attachInternals();
  /** @readonly */ #expansionObserver = new MutationObserver(MenuElement.#watchExpansion);
  /** @readonly */ #childNodesObserver = new MutationObserver(MenuElement.#watchChildNodes);
  /** Indicates that the `menu` is currently registered with a valid `menubutton` */ #registered = false;
  /** @type {HTMLButtonElement | null} */ #menuButtonElement = null;
  /** @type {HTMLElement | null} */ #menuAnchorElement = null;
  /** @private @type {HTMLElement | null} */ [startingActivedescendant] = null;
  /** @private @type {number | undefined} */ [searchTimeout];
  /** @private @type {string} */ [searchString] = "";

  static get observedAttributes() {
    return /** @type {const} */ (["menubutton", "menuanchor", "openwitharrows"]);
  }

  constructor() {
    super();
    this.#internals.role = "menu";
  }

  /** "On Mount" for Custom Elements @returns {void} */
  connectedCallback() {
    // NOTE: This is needed for Playwright Testing (until they support `ElementInternals.role`)
    this.role = "menu";

    // Validate Children and Normalize `tabindex` for `menuitem`s
    let node = this.firstChild;
    while (node) {
      const nextNode = node.nextSibling;

      // @ts-expect-error -- This is valid JS and is sadly necessary if we want to prioritize brevity.
      if (node instanceof Comment);
      else if (!(node instanceof HTMLElement)) node.remove();
      else if (node.role === "menuitem") node.tabIndex = -1;
      node = nextNode;
    }

    // Setup Event Listeners
    this.addEventListener("focusin", MenuElement.#handleDelegatedMenuItemFocusin, { passive: true });
    this.addEventListener("focusout", MenuElement.#handleDelegatedMenuItemFocusout, { passive: true });
    this.addEventListener("pointerover", MenuElement.#handleDelegatedMenutItemHover, { passive: true });
    this.addEventListener("keydown", MenuElement.#handleDelegatedMenuItemKeydown);
    this.addEventListener("click", MenuElement.#handleDelegatedMenuItemClick, { passive: true });
    this.addEventListener("pointerdown", MenuElement.#handleDelegatedPointerdown);
    this.#childNodesObserver.observe(this, { childList: true });

    // Perform `menubutton` and `menuanchor` associations/setup in case attributes were set outside the DOM
    const menubuttonAttr = this.getAttribute("menubutton");
    const menuanchorAttr = this.getAttribute("menuanchor");
    if (!this.#menuAnchorElement && menuanchorAttr) this.attributeChangedCallback("menuanchor", null, menuanchorAttr);
    if (!this.#menuButtonElement && menubuttonAttr) this.attributeChangedCallback("menubutton", null, menubuttonAttr);
    else if (this.#menuButtonElement) this.#registerMenuButton(this.#menuButtonElement); // `DocumentFragment`s can put us here
  }

  /** "On Unmount" for Custom Elements @returns {void} */
  disconnectedCallback() {
    this.removeEventListener("focusin", MenuElement.#handleDelegatedMenuItemFocusin);
    this.removeEventListener("focusout", MenuElement.#handleDelegatedMenuItemFocusout);
    this.removeEventListener("pointerover", MenuElement.#handleDelegatedMenutItemHover);
    this.removeEventListener("keydown", MenuElement.#handleDelegatedMenuItemKeydown);
    this.removeEventListener("click", MenuElement.#handleDelegatedMenuItemClick);
    this.removeEventListener("pointerdown", MenuElement.#handleDelegatedPointerdown);
    this.#childNodesObserver.disconnect();
    if (this.#menuButtonElement) this.#unregisterMenuButton(this.#menuButtonElement);
  }

  /**
   * @param {typeof MenuElement.observedAttributes[number]} name
   * @param {string | null} oldValue
   * @param {string | null} newValue
   * @returns {void}
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "openwitharrows") {
      if ((newValue == null) === (oldValue == null) || !this.#menuButtonElement) return;
      this.#unregisterMenuButton(this.#menuButtonElement);
      if (this.isConnected) this.#registerMenuButton(this.#menuButtonElement);
    }

    if (name === "menubutton") {
      if (oldValue === newValue) return;
      if (this.#menuButtonElement) this.#unregisterMenuButton(this.#menuButtonElement);

      const root = /** @type {Document | DocumentFragment | ShadowRoot} */ (this.getRootNode());
      if (!("getElementById" in root)) return; // Attribute was added BEFORE mounting to the DOM

      const target = newValue ? root.getElementById(newValue) : null;
      this.#menuButtonElement = target instanceof HTMLButtonElement ? target : null;
      if (this.#menuButtonElement && this.isConnected) this.#registerMenuButton(this.#menuButtonElement);

      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Useful for reordering or clarifying intent
    if (name === "menuanchor") {
      if (oldValue === newValue) return;
      const root = /** @type {Document | DocumentFragment | ShadowRoot} */ (this.getRootNode());
      if (!("getElementById" in root)) return; // Attribute was added BEFORE mounting to the DOM

      const target = newValue ? root.getElementById(newValue) : null;
      this.#menuAnchorElement = target instanceof HTMLElement ? target : null;
      if (this.#menuAnchorElement && this.#menuAnchorElement !== this.parentNode) this.#menuAnchorElement.append(this);

      return; // eslint-disable-line no-useless-return -- I want code in this callback to be easily moved around
    }
  }

  /**
   * Registers the event listeners that the associated `menubutton` needs to operate the `menu` properly.
   * @param {HTMLElement} menubutton
   * @returns {void}
   */
  #registerMenuButton(menubutton) {
    if (this.#registered) return;

    menubutton.addEventListener("click", MenuElement.#handleMenuButtonClick, { passive: true });
    menubutton.addEventListener("pointerdown", MenuElement.#handleMenuButtonPointerdown, { passive: true });
    if (this.openWithArrows) menubutton.addEventListener("keydown", MenuElement.#handleMenuButtonKeydown);
    this.#expansionObserver.observe(menubutton, {
      attributes: true,
      attributeFilter: [attrs["aria-expanded"]],
      attributeOldValue: true,
    });

    this.#registered = true;
  }

  /**
   * Dissociates the `menu` from the provided `menubutton` by unregistering any event listeners it attached to it.
   * @param {HTMLElement} menubutton
   * @returns {void}
   */
  #unregisterMenuButton(menubutton) {
    // Clean up listeners/observers
    menubutton.removeEventListener("click", MenuElement.#handleMenuButtonClick);
    menubutton.removeEventListener("pointerdown", MenuElement.#handleMenuButtonPointerdown);
    menubutton.removeEventListener("keydown", MenuElement.#handleMenuButtonKeydown);
    this.#expansionObserver.disconnect();

    // Force collapse elements
    /*
     * WARNING: If `openwitharrows` is changed, an open `menu` can be collapsed, unless we add a special edge-case guard
     * like `keepOpen` for that scenario below. That said, it's hard to think of a practical scenario where a developer
     * will change `openwitharrows` _while the `menu` is open_. Almost certainly, a given button should _always_ have
     * ArrowKey functionality or always _not_ have it. So we don't need to add code to handle this unrealistic use case,
     * but we should be aware of it in case it becomes a concern in the future.
     */
    menubutton.ariaExpanded = String(false); // eslint-disable-line no-param-reassign
    this.removeAttribute(attrs["data-open"]);
    clearTimeout(this[searchTimeout]);
    /** @type {MenuElement} */ (this)[searchString] = ""; // Cast is required to fix an ambiguous TS error. See `NOTES.md`.

    // Confirm unregistration
    this.#registered = false;
  }

  /** Indicates that `ArrowUp` and `ArrowDown` can be used as an alternative way to open the `menu`. @returns {boolean} */
  get openWithArrows() {
    return this.hasAttribute("openwitharrows");
  }

  set openWithArrows(value) {
    this.toggleAttribute("openwitharrows", value);
  }

  /** @returns {HTMLButtonElement | null} The `menubutton` which controls this `menu` */
  get menuButtonElement() {
    return this.#menuButtonElement;
  }

  /**
   * @returns {HTMLElement | null} The element to which this `menu` is "anchored". (i.e., the element with
   * respect to which this `menu` is positioned.) Must be a _positioned_ element, such as `position: relative`.
   */
  get menuAnchorElement() {
    return this.#menuAnchorElement;
  }

  /**
   * Returns the first following sibling that is a `menuitem` element, and `null` otherwise.
   *
   * The returned result is with respect to the provided `item`.
   * @param {HTMLElement} item
   * @returns {Element | null}
   */
  static #getNextMenuItem(item) {
    let nextItem = item.nextElementSibling;
    while (nextItem && nextItem.role !== "menuitem") nextItem = nextItem.nextElementSibling;
    return nextItem;
  }

  /**
   * Returns the first preceding sibling that is a `menuitem` element, and `null` otherwise.
   *
   * The returned result is with respect to the provided `item`.
   * @param {HTMLElement} item
   * @returns {Element | null}
   */
  static #getPreviousMenuItem(item) {
    let previousItem = item.previousElementSibling;
    while (previousItem && previousItem.role !== "menuitem") previousItem = previousItem.previousElementSibling;
    return previousItem;
  }

  /* ---------------------------------------- MenuButton Handlers / Observers ---------------------------------------- */
  /**
   * @param {PointerEvent} event
   * @returns {void}
   */
  static #handleMenuButtonClick(event) {
    if (event.button !== 0) return; // Only acknowledge "Primary" clicks
    const menubutton = /** @type {HTMLElement} */ (event.currentTarget);
    const expanded = menubutton.ariaExpanded === String(true);
    menubutton.ariaExpanded = String(!expanded);
  }

  /**
   * Used to determine if a `menubutton` was `:focus`ed by a `click` event.
   * @param {PointerEvent} event
   * @returns {void}
   */
  static #handleMenuButtonPointerdown(event) {
    if (event.button !== 0) return; // Only acknowledge "Primary" clicks
    const menubutton = /** @type {HTMLElement} */ (event.currentTarget);
    if (/** @type {Document | ShadowRoot} */ (menubutton.getRootNode()).activeElement === menubutton) return;

    menubutton.setAttribute(attrs["data-pointerdown"], "");
    document.addEventListener("pointerup", () => menubutton.removeAttribute(attrs["data-pointerdown"]), { once: true });
  }

  /**
   * @param {KeyboardEvent} event
   * @returns {void}
   */
  static #handleMenuButtonKeydown(event) {
    const { key } = event;
    if (key !== "ArrowUp" && key !== "ArrowDown") return; // Nothing to do

    const menubutton = /** @type {HTMLElement} */ (event.currentTarget);
    const expanded = menubutton.ariaExpanded === String(true);
    if (expanded) return; // Menu was already expanded by ArrowKeys. (Technically, we should never get here.)

    event.preventDefault(); // Don't scroll
    const root = /** @type {Document | ShadowRoot} */ (menubutton.getRootNode());
    const menuId = /** @type {string} */ (menubutton.getAttribute("aria-controls"));
    const menu = /** @type {MenuElement} */ (root.getElementById(menuId));
    const activeItem = /** @type {HTMLElement} */ (key === "ArrowUp" ? menu.lastElementChild : menu.firstElementChild);

    menu[startingActivedescendant] = activeItem;
    menubutton.setAttribute(attrs["aria-expanded"], String(true));
  }

  /**
   * @param {MutationRecord[]} mutations
   * @returns {void}
   */
  static #watchExpansion(mutations) {
    // NOTE: Callback assumes it is always triggered naturally, NOT programmatically (e.g., for `observer.takeRecords()`).
    const menubutton = /** @type {HTMLElement} */ (mutations[0].target);
    const oldState = mutations[0].oldValue === String(true) ? "open" : "closed";
    const newState = menubutton.ariaExpanded === String(true) ? "open" : "closed";
    if (newState === oldState) return;

    // Update Menu State
    const root = /** @type {Document | DocumentFragment | ShadowRoot} */ (menubutton.getRootNode());
    const menuId = /** @type {string} */ (menubutton.getAttribute("aria-controls"));
    const menu = /** @type {MenuElement} */ (root.getElementById(menuId));

    if (newState === "closed") {
      menu.removeAttribute(attrs["data-open"]);
      clearTimeout(menu[searchTimeout]);
      menu[searchString] = "";
    } else {
      menu.setAttribute(attrs["data-open"], "");

      const newlyActiveItem = /** @type {HTMLElement} */ (menu[startingActivedescendant] ?? menu.firstElementChild);
      newlyActiveItem.focus();
      menu[startingActivedescendant] = null;
    }
  }

  /* ---------------------------------------- Menu / MenuItem Handlers ---------------------------------------- */
  /*
   * NOTE: A user can only interact with a `menuitem` if its owning `menu` is open, which means that its corresponding
   * `menubutton` exists and at some point was toggled to become `[aria-expanded="true"]`. Consequently, if any event
   * handler for a `menu`/`menuitem` is executed, we are guaranteed that `MenuElement.menuButtonElement` exists.
   *
   * This is why you see these event handlers liberally cast `MenuElement.menuButtonElement` as non-null; the cast
   * is always guaranteed to be safe for these event handlers (assuming they are executed synchronously and the developer
   * has not broken the required DOM structure -- which no one would ever have plausible reason to do.)
   */

  /**
   * @param {FocusEvent} event
   * @returns {void}
   */
  static #handleDelegatedMenuItemFocusin(event) {
    const menuitem = /** @type {HTMLElement} */ (event.target);
    menuitem.tabIndex = 0;
  }

  /**
   * @param {FocusEvent} event
   * @returns {void}
   */
  static #handleDelegatedMenuItemFocusout(event) {
    const menuitem = /** @type {HTMLElement} */ (event.target);
    menuitem.tabIndex = -1;

    const menu = /** @type {MenuElement} */ (event.currentTarget);
    const activeElement = /** @type {Element | null} */ (event.relatedTarget);

    if (!activeElement || activeElement.parentElement !== menu) {
      // NOTE: `menubutton` will be `null` here IFF `menu` closed in response to a forceful `menubutton` dissociation
      const { menuButtonElement } = menu;
      if (!menuButtonElement) return;

      // NOTE: If `data-pointerdown` is present, then `menubutton` will update expanded state on its own
      if (menuButtonElement.hasAttribute(attrs["data-pointerdown"])) return;
      setAttributeFor(menuButtonElement, attrs["aria-expanded"], String(false));
    }
  }

  /**
   * @param {PointerEvent} event
   * @returns {void}
   */
  static #handleDelegatedMenutItemHover(event) {
    const menuitem = /** @type {HTMLElement} */ (event.target);
    if (menuitem.role !== "menuitem") return; // We hovered `menu` or `separator`. Assumes proper `pointer-events` CSS.
    menuitem.focus();
  }

  /**
   * @param {KeyboardEvent} event
   * @returns {void}
   */
  static #handleDelegatedMenuItemKeydown(event) {
    const menu = /** @type {MenuElement} */ (event.currentTarget);
    const root = /** @type {Document | ShadowRoot} */ (menu.getRootNode());
    const activeItem = /** @type {HTMLElement} */ (root.activeElement);

    if (event.key === "ArrowDown") {
      event.preventDefault(); // Don't scroll
      const nextActiveItem = /** @type {typeof activeItem | null} */ (MenuElement.#getNextMenuItem(activeItem));
      return nextActiveItem?.focus();
    }

    if (event.key === "End") {
      event.preventDefault(); // Don't scroll
      const lastItem = /** @type {typeof activeItem} */ (menu.lastElementChild);
      return lastItem.focus();
    }

    if (event.key === "ArrowUp") {
      event.preventDefault(); // Don't scroll
      const nextActiveItem = /** @type {typeof activeItem | null} */ (MenuElement.#getPreviousMenuItem(activeItem));
      return nextActiveItem?.focus();
    }

    if (event.key === "Home") {
      event.preventDefault(); // Don't scroll
      const firstItem = /** @type {typeof activeItem} */ (menu.firstElementChild);
      return firstItem.focus();
    }

    if (event.key === "Escape") {
      event.preventDefault(); // Avoid unexpected side-effects like closing `dialog`s
      const menubutton = /** @type {HTMLButtonElement} */ (menu.menuButtonElement);
      menubutton.ariaExpanded = String(false);
      return menubutton.focus();
    }

    if ((event.key === " " && !menu[searchString]) || event.key === "Enter") {
      event.preventDefault(); // Don't attempt a native click action, and don't scroll
      return activeItem.click();
    }

    if (event.key.length === 1 && !event.altKey && !event.ctrlKey && !event.metaKey) {
      if (event.key === " ") event.preventDefault(); // Don't scroll
      menu[searchString] += event.key;

      // Determine next active `menuitem`
      const lastItemToEvaluate = activeItem;
      let nextActiveItem = /** @type {typeof activeItem | null} */ (lastItemToEvaluate);

      while (nextActiveItem !== null) {
        nextActiveItem = /** @type {HTMLElement} */ (nextActiveItem.nextElementSibling ?? menu.firstElementChild);
        if (nextActiveItem.role !== "menuitem") continue;
        if (nextActiveItem.textContent.toLowerCase().startsWith(menu[searchString].toLowerCase())) break;
        if (nextActiveItem === lastItemToEvaluate) nextActiveItem = null;
      }

      // Update Search and active `menuitem`
      clearTimeout(menu[searchTimeout]);
      if (!nextActiveItem) {
        menu[searchString] = "";
        return;
      }

      nextActiveItem.focus();
      menu[searchTimeout] = setTimeout(() => (menu[searchString] = ""), 500);
    }
  }

  /**
   * @param {PointerEvent} event
   * @returns {void}
   */
  static #handleDelegatedMenuItemClick(event) {
    if (event.button !== 0) return; // Only acknowledge "Primary" clicks

    const menuitem = /** @type {HTMLElement} */ (event.target);
    if (menuitem.role !== "menuitem") return; // We clicked `menu` or `separator`. Assumes proper `pointer-events` CSS.
    if (menuitem.ariaDisabled === String(true)) return;

    // NOTE: Using a `data-*` attribute because `action` isn't a native attribute or a guaranteed Custom Element attribute
    const detail = menuitem.getAttribute("data-action");
    if (!detail) throw new TypeError("A `menuitem` without a populated `data-action` attribute was selected.");

    const menu = /** @type {MenuElement} */ (event.currentTarget);
    menu.dispatchEvent(new CustomEvent("menuselect", { bubbles: true, composed: false, cancelable: false, detail }));
    /** @type {HTMLButtonElement} */ (menu.menuButtonElement).focus();
  }

  /**
   * @param {PointerEvent} event
   * @returns {void}
   */
  static #handleDelegatedPointerdown(event) {
    // Don't remove focus from `menuitem`s if we clicked `menu` or `separator`. Assumes proper `pointer-events` CSS.
    const menuitem = /** @type {HTMLElement} */ (event.target);
    if (menuitem.role !== "menuitem") return event.preventDefault();
  }

  /**
   * A {@link MutationObserver} callback which watches for and initializes newly added `menuitem`s
   * @param {MutationRecord[]} mutations
   * @returns {void}
   */
  static #watchChildNodes(mutations) {
    for (let i = 0; i < mutations.length; i++) {
      const mutation = mutations[i];
      for (let j = 0; j < mutation.addedNodes.length; j++) {
        const node = mutation.addedNodes[j];
        if (node instanceof Comment) continue;
        else if (!(node instanceof HTMLElement)) /** @type {MenuElement} */ (node.parentNode).removeChild(node);
        else if (node.role === "menuitem") node.tabIndex = -1;
      }
    }
  }
}

export default MenuElement;
