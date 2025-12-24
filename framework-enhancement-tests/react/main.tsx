import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { SelectEnhancer, ComboboxField, ComboboxListbox, ComboboxOption } from "@itenthusiasm/custom-elements";
import ExampleForm from "./ExampleForm.jsx";

if (!customElements.get("combobox-listbox")) customElements.define("combobox-listbox", ComboboxListbox);
if (!customElements.get("combobox-field")) customElements.define("combobox-field", ComboboxField);
if (!customElements.get("combobox-option")) customElements.define("combobox-option", ComboboxOption);
if (!customElements.get("select-enhancer")) customElements.define("select-enhancer", SelectEnhancer);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ExampleForm />
  </StrictMode>,
);
