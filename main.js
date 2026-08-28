// Primary Imports
import {
  CheckboxGroup,
  MenuElement,
  ComboboxField,
  ComboboxListbox,
  ComboboxOption,
  SelectEnhancer,
} from "@itenthusiasm/custom-elements";

/* -------------------- "App Logic" -------------------- */
customElements.define("menu-element", MenuElement);
customElements.define("checkbox-group", CheckboxGroup);
customElements.define("combobox-listbox", ComboboxListbox);
customElements.define("combobox-field", ComboboxField);
customElements.define("combobox-option", ComboboxOption);
customElements.define("select-enhancer", SelectEnhancer);

/* -------------------- Handlers for Debugging -------------------- */
/* ---------- Form Submission ---------- */
/** @type {HTMLFormElement} */ (document.querySelector("form")).addEventListener("submit", handleSubmit);

/** @param {SubmitEvent} event */
function handleSubmit(event) {
  event.preventDefault();
  const form = /** @type {HTMLFormElement} */ (event.currentTarget);
  console.log(Object.fromEntries(new FormData(form))); // eslint-disable-line no-console
  console.log(event); // eslint-disable-line no-console
}

/* ---------- Menu Item Selection ---------- */
const menudemo = /** @type {HTMLElement} */ (document.getElementById("advanced-menu-example"));
menudemo.addEventListener("click", handleButtonGroupClick);
menudemo.addEventListener("menuselect", handleMenuselect);

/** @param {PointerEvent} event @returns {void} */
function handleButtonGroupClick(event) {
  const menubutton = /** @type {HTMLElement} */ (event.target).closest("button");
  if (!menubutton) return;

  const menuId = /** @type {string} */ (menubutton.getAttribute("aria-controls"));
  const menu = /** @type {MenuElement} */ (document.getElementById(menuId));
  const anchor = /** @type {HTMLElement} */ (menubutton.parentElement);
  if (anchor.contains(menu)) return; // The `menu` has already been anchored here

  // Re-anchor the `menu` and associate it with the new `<button>`.
  menu.setAttribute("menubutton", menubutton.id);
  menu.setAttribute("menuanchor", anchor.id);
  menubutton.ariaExpanded = String(true);
}

/** @param {CustomEvent<string>} event @returns {void} */
function handleMenuselect(event) {
  console.log("Action Selected: ", event.detail); // eslint-disable-line no-console
}
