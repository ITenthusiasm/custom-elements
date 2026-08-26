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
const menudemo = /** @type {HTMLElement} */ (document.getElementById("menudemo"));
menudemo.addEventListener("click", handleClick);
menudemo.addEventListener("menuselect", handleMenuSelect);

/** @param {PointerEvent} event @returns {void} */
function handleClick(event) {
  const button = event.target;
  if (!(button instanceof HTMLButtonElement) || !button.id.startsWith("button")) return;

  const menuId = /** @type {string} */ (button.getAttribute("aria-controls"));
  const menu = /** @type {MenuElement} */ (document.getElementById(menuId));
  if (button.nextElementSibling === menu) return;

  menu.setAttribute("menuanchor", /** @type {HTMLElement} */ (button.parentElement).id);
  menu.setAttribute("menubutton", button.id);
  button.ariaExpanded = String(true);
}

/** @param {CustomEvent<string>} event @returns {void} */
function handleMenuSelect(event) {
  console.log("Action Selected: ", event.detail); // eslint-disable-line no-console
}
