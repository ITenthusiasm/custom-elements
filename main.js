// Primary Imports
import ComboboxField from "./src/Combobox/ComboboxField.js";
import ComboboxListbox from "./src/Combobox/ComboboxListbox.js";
import ComboboxOption from "./src/Combobox/ComboboxOption.js";
import SelectEnhancer from "./src/Combobox/SelectEnhancer.js";

/* -------------------- "App Logic" -------------------- */
customElements.define("combobox-listbox", ComboboxListbox);
customElements.define("combobox-field", ComboboxField);
customElements.define("combobox-option", ComboboxOption);
customElements.define("select-enhancer", SelectEnhancer);

/* -------------------- Handlers for Debugging -------------------- */
document.querySelector("form")?.addEventListener("submit", handleSubmit);

/** @param {SubmitEvent} event */
function handleSubmit(event) {
  event.preventDefault();
  const form = /** @type {HTMLFormElement} */ (event.currentTarget);
  console.log(Object.fromEntries(new FormData(form))); // eslint-disable-line no-console
  console.log(event); // eslint-disable-line no-console
}
