import { mount } from "svelte";
import {
  CheckboxGroup,
  SelectEnhancer,
  ComboboxField,
  ComboboxListbox,
  ComboboxOption,
} from "@itenthusiasm/custom-elements";
import type {} from "@itenthusiasm/custom-elements/types/svelte.d.ts";
import FormValidityObserverSvelteTest from "./FormValidityObserverSvelteTest.svelte";

if (!customElements.get("checkbox-group")) customElements.define("checkbox-group", CheckboxGroup);
if (!customElements.get("combobox-listbox")) customElements.define("combobox-listbox", ComboboxListbox);
if (!customElements.get("combobox-field")) customElements.define("combobox-field", ComboboxField);
if (!customElements.get("combobox-option")) customElements.define("combobox-option", ComboboxOption);
if (!customElements.get("select-enhancer")) customElements.define("select-enhancer", SelectEnhancer);

const app = mount(FormValidityObserverSvelteTest, { target: document.getElementById("app") as HTMLElement });
export default app;
