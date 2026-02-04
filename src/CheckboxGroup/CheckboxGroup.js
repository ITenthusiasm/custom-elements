/** @import {ExposedInternals, FieldPropertiesAndMethods, FieldMinMax} from "../types/helpers.js" */

/** @implements {ExposedInternals} @implements {FieldPropertiesAndMethods} @implements {FieldMinMax} */
class CheckboxGroup extends HTMLElement {
  /* ------------------------------ Custom Element Settings ------------------------------ */
  /** @returns {true} */
  static get formAssociated() {
    return true;
  }

  static get observedAttributes() {
    return /** @type {const} */ ([
      "required",
      "valuemissingerror",
      "min",
      "rangeunderflowerror",
      "max",
      "rangeoverflowerror",
    ]);
  }

  /** @readonly */ #internals = this.attachInternals();

  /* ------------------------------ Lifecycle Callbacks ------------------------------ */
  constructor() {
    super();
    // NOTE: For Playwright and Browser Compatibility purposes, we'll still need to set the `role` attribute explicitly.
    this.#internals.role = "group";

    // NOTE: We are intentionally adding these here to monitor behavior of elements not connected to the DOM.
    this.addEventListener("click", this.#handleClick.bind(this));
    new MutationObserver(this.#watchChildren.bind(this)).observe(this, { childList: true, subtree: true });
  }

  /**
   * @param {typeof CheckboxGroup.observedAttributes[number]} _name
   * @param {string | null} _oldValue
   * @param {string | null} _newValue
   * @returns {void}
   */
  attributeChangedCallback(_name, _oldValue, _newValue) {
    // NOTE: If we're only watching constraint-related attributes, then we only need to re-run validation here.
    if (!this.fieldset) return; // eslint-disable-line @typescript-eslint/no-unnecessary-condition -- Check needed here.
    this.#validateConstraints();
  }

  /** "On Mount" for Custom Elements @returns {void} */
  connectedCallback() {
    if (!this.isConnected) return;
    if (!(this.lastElementChild instanceof HTMLFieldSetElement) || this.firstElementChild !== this.lastElementChild) {
      throw new TypeError("A <fieldset> element must be the only direct descendant of the `CheckboxGroup`.");
    }

    // Transfer `<fieldset>` attributes to `CheckboxGroup`
    const { fieldset } = this;
    const attributeNames = fieldset.getAttributeNames();
    for (let i = 0; i < attributeNames.length; i++) {
      const attrName = attributeNames[i];
      this.setAttribute(attrName, /** @type {string} */ (fieldset.getAttribute(attrName)));
      fieldset.removeAttribute(attrName);
    }

    // Initialize essential attributes
    this.id ||= Math.random().toString(36).slice(2);
    this.setAttribute("role", "group");
    this.lastElementChild.setAttribute("role", "none");

    // Transfer `<fieldset>`'s label if it exists
    const legend = fieldset.firstElementChild;
    if (legend instanceof HTMLLegendElement && !this.manual) {
      const label = document.createElement("label");
      label.htmlFor = this.id;
      label.append(...legend.childNodes);
      legend.replaceWith(label);
    }

    // Initialize checkbox data
    const { elements } = this.fieldset;
    for (let i = 0; i < elements.length; i++) {
      const checkbox = elements[i];
      // TODO: Document that, at least for now, nesting `checkbox` groups is not suppoted
      if (!(checkbox instanceof HTMLInputElement) || checkbox.type !== "checkbox") {
        throw new TypeError("`checkbox`es are the only form controls allowed inside the `CheckboxGroup`'s <fieldset>");
      }

      // TODO: Document the auto-`name`-ing behavior. It's worth being aware of.
      this.#value[checkbox.checked ? "add" : "delete"](checkbox.value);
      if (i === 0 && checkbox.name) this.name = checkbox.name;
      checkbox.removeAttribute("name");
      checkbox.setAttribute("form", "");
    }

    this.#updateFormValue();
    this.#validateConstraints();
  }

  /* ------------------------------ Exposed Form Properties ------------------------------ */
  /** @type {Set<string>} */ #value = new Set();

  // TODO: Document that for Data Integrity purposes, this getter always creates a new `Array`. So devs should be mindful.
  /** Sets or retrieves the `value` of the `CheckboxGroup` @returns {string[]} */
  get value() {
    return Array.from(this.#value);
  }

  // TODO: Document why devs should be mindful of setting `value` as well.
  set value(v) {
    this.#value.clear();

    const checkboxes = /** @type {HTMLCollectionOf<HTMLInputElement>} */ (this.fieldset.elements);
    for (let i = 0; i < this.fieldset.elements.length; i++) {
      const checkbox = checkboxes[i];
      checkbox.checked = v.findIndex((V) => String(V) === checkbox.value) !== -1;
      if (checkbox.checked) this.#value.add(checkbox.value);
    }

    this.#updateFormValue();
    this.#validateConstraints();
  }

  /** Synchronizes the component's form value with its internal value @returns {void} */
  #updateFormValue() {
    if (!this.#value.size) return this.#internals.setFormValue(null);

    const formData = new FormData();
    this.#value.forEach((v) => formData.append(this.name, v));
    this.#internals.setFormValue(formData);
  }

  /** The singular `<fieldset>` owned by this checkbox group @returns {HTMLFieldSetElement} */
  get fieldset() {
    return /** @type {HTMLFieldSetElement} */ (this.lastElementChild);
  }

  /** @returns {HTMLInputElement["name"]} */
  get name() {
    return this.getAttribute("name") ?? "";
  }

  set name(value) {
    this.setAttribute("name", value);
  }

  /** @returns {HTMLInputElement["disabled"]} */
  get disabled() {
    return this.hasAttribute("disabled");
  }

  set disabled(value) {
    this.toggleAttribute("disabled", value);
  }

  /** @returns {HTMLInputElement["required"]} */
  get required() {
    return this.hasAttribute("required");
  }

  set required(value) {
    this.toggleAttribute("required", value);
  }

  /** @returns {HTMLInputElement["min"]} */
  get min() {
    return this.getAttribute("min") ?? "";
  }

  set min(value) {
    this.setAttribute("min", value);
  }

  /** @returns {HTMLInputElement["max"]} */
  get max() {
    return this.getAttribute("max") ?? "";
  }

  set max(value) {
    this.setAttribute("max", value);
  }

  /**
   * Indicates that the `CheckboxGroup` should not replace its `<fieldset>`'s accessible label (`<legend>`)
   * with its own (`<label>`) when mounted.
   *
   * **WARNING**: Only enable this property if you intend to perform the label replacement yourself.
   * @returns {boolean}
   */
  get manual() {
    return this.hasAttribute("manual");
  }

  set manual(value) {
    this.toggleAttribute("manual", value);
  }

  /* ------------------------------ Custom Attributes and Properties ------------------------------ */
  /** The error message displayed to users when the group's `required` constraint is broken. @returns {string} */
  get valueMissingError() {
    return this.getAttribute("valuemissingerror") ?? "Please select one or more items.";
  }

  set valueMissingError(value) {
    this.setAttribute("valuemissingerror", value);
  }

  /** The error message displayed to users when the group's `min` constraint is broken. @returns {string} */
  get rangeUnderflowError() {
    const items = Number(this.min) === 1 ? "item" : "items";
    return this.getAttribute("rangeunderflowerror") ?? `Please select at least ${this.min} ${items}.`;
  }

  set rangeUnderflowError(value) {
    this.setAttribute("rangeunderflowerror", value);
  }

  /** The error message displayed to users when the group's `max` constraint is broken. @returns {string} */
  get rangeOverflowError() {
    const items = Number(this.max) === 1 ? "item" : "items";
    return this.getAttribute("rangeoverflowerror") ?? `Please select no more than ${this.max} ${items}.`;
  }

  set rangeOverflowError(value) {
    this.setAttribute("rangeoverflowerror", value);
  }

  /* ------------------------------ Exposed `ElementInternals` ------------------------------ */
  /** @returns {ElementInternals["labels"]} */
  get labels() {
    return this.#internals.labels;
  }

  /** @returns {ElementInternals["form"]} */
  get form() {
    return this.#internals.form;
  }

  /** @returns {ElementInternals["validity"]} */
  get validity() {
    return this.#internals.validity;
  }

  /** @returns {ElementInternals["validationMessage"]} */
  get validationMessage() {
    return this.#internals.validationMessage;
  }

  /** @returns {ElementInternals["willValidate"]} */
  get willValidate() {
    return this.#internals.willValidate;
  }

  /** @type {ElementInternals["checkValidity"]} */
  checkValidity() {
    return this.#internals.checkValidity();
  }

  /** @type {ElementInternals["reportValidity"]} */
  reportValidity() {
    return this.#internals.reportValidity();
  }

  /** @type {HTMLInputElement["setCustomValidity"]} */
  setCustomValidity(error) {
    this.#customError = error;
    this.#validateConstraints();
  }

  #customError = "";
  /** @returns {void} */
  #validateConstraints() {
    // TODO: Document that `radio`s should be used if `min` === `max` (a11y).
    const min = Number(this.min);
    const max = Number(this.max);
    const count = this.#value.size;

    // TODO: Document that users should provide `min/max` values that make sense. `min > max` is not logical and will hurt UX.
    // TODO: Also document that `min` might be preferable to `required` since it's more flexible.
    const valueMissing = this.required && !count;
    const rangeUnderflow = this.hasAttribute("min") && !Number.isNaN(min) && count < min;
    const rangeOverflow = this.hasAttribute("max") && !Number.isNaN(max) && count > max;
    const customError = Boolean(this.#customError);

    /** @type {string | undefined} */ let message;
    if (customError) message = this.#customError;
    else if (rangeUnderflow) message = this.rangeUnderflowError;
    else if (valueMissing) message = this.valueMissingError;
    else if (rangeOverflow) message = this.rangeOverflowError;

    const anchor = message ? /** @type {HTMLInputElement} */ (this.fieldset.elements[0]) : undefined;
    this.#internals.setValidity({ valueMissing, rangeUnderflow, rangeOverflow, customError }, message, anchor);
  }

  /* ------------------------------ Form Control Callbacks ------------------------------ */
  /** @returns {void} */
  formResetCallback() {
    this.#value.clear(); // NOTE: This is done to guarantee consistent ordering during `reset`s (nice-to-have)
    const checkboxes = /** @type {HTMLCollectionOf<HTMLInputElement>} */ (this.fieldset.elements);
    for (let i = 0; i < checkboxes.length; i++) {
      const checkbox = checkboxes[i];
      checkbox.checked = checkbox.defaultChecked;
      if (checkbox.checked) this.#value.add(checkbox.value);
    }

    this.#updateFormValue();
  }

  /**
   * @param {FormData | null} state
   * @param {"restore" | "autocomplete"} _mode
   * @returns {void}
   */
  formStateRestoreCallback(state, _mode) {
    this.#value = new Set(/** @type {FormDataIterator<string> | undefined} */ (state?.values()));
    this.#updateFormValue();
  }

  /**
   * @param {boolean} disabled
   * @returns {void}
   */
  formDisabledCallback(disabled) {
    this.fieldset.disabled = disabled;
  }

  /* ------------------------------ Event Handlers + Mutation Observers ------------------------------ */
  /**
   * Monitors the clicks on individual `checkbox`es, updating the {@link CheckboxGroup}'s value as needed.
   * @param {MouseEvent} event
   * @returns {void}
   */
  #handleClick(event) {
    const input = event.target;
    if (!event.isTrusted || event.defaultPrevented || !(input instanceof HTMLInputElement)) return;

    event.preventDefault(); // Prevent developers from receiving irrelevant `input`/`change` events
    const { checked } = input;
    setTimeout(() => {
      input.checked = checked;
      this.#value[checked ? "add" : "delete"](input.value);
      this.#updateFormValue();
      this.#validateConstraints();

      this.dispatchEvent(new Event("input", { bubbles: true, composed: true, cancelable: false }));
      this.dispatchEvent(new Event("change", { bubbles: true, composed: false, cancelable: false }));
    });
  }

  /**
   * Monitors the `checkbox`es that are added to or removed from the {@link CheckboxGroup}, updating its value as needed.
   * @param {MutationRecord[]} mutations
   * @returns {void}
   */
  #watchChildren(mutations) {
    if (!(this.lastElementChild instanceof HTMLFieldSetElement) || this.firstElementChild !== this.lastElementChild) {
      throw new TypeError("A <fieldset> element must be the only direct descendant of the `CheckboxGroup`.");
    }

    for (let i = 0; i < mutations.length; i++) {
      const { addedNodes, removedNodes } = mutations[i];

      let workingWithRemovedNodes = Boolean(removedNodes.length);
      let nodes = workingWithRemovedNodes ? removedNodes : addedNodes;
      for (let j = 0; j < nodes.length; j++) {
        const node = nodes[j];
        if (!(node instanceof HTMLElement)) continue;

        /** @type {ArrayLike<HTMLInputElement>} */
        const checkboxes = node instanceof HTMLInputElement ? [node] : node.querySelectorAll(":scope input");

        for (let k = 0; k < checkboxes.length; k++) {
          const checkbox = checkboxes[k];
          if (checkbox.checked) this.#value[workingWithRemovedNodes ? "delete" : "add"](checkbox.value);

          if (!workingWithRemovedNodes) {
            checkbox.removeAttribute("name");
            checkbox.setAttribute("form", "");
          }
        }

        if (workingWithRemovedNodes && j === removedNodes.length - 1) {
          nodes = addedNodes;
          workingWithRemovedNodes = false;
          j = -1;
        }
      }
    }

    this.#updateFormValue();
    this.#validateConstraints();
  }
}

export default CheckboxGroup;
