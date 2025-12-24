import { mount } from "svelte";
import { SelectEnhancer, ComboboxField, ComboboxListbox, ComboboxOption } from "@itenthusiasm/custom-elements";
import type {} from "@itenthusiasm/custom-elements/types/svelte.d.ts";
import ExampleForm from "./ExampleForm.svelte";

if (!customElements.get("combobox-listbox")) customElements.define("combobox-listbox", ComboboxListbox);
if (!customElements.get("combobox-field")) customElements.define("combobox-field", ComboboxField);
if (!customElements.get("combobox-option")) customElements.define("combobox-option", ComboboxOption);
if (!customElements.get("select-enhancer")) customElements.define("select-enhancer", SelectEnhancer);

const app = mount(ExampleForm, { target: document.getElementById("app") as HTMLElement });
export default app;
