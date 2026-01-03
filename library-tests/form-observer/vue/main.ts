import { createApp } from "vue";
import {
  CheckboxGroup,
  SelectEnhancer,
  ComboboxField,
  ComboboxListbox,
  ComboboxOption,
} from "@itenthusiasm/custom-elements";
import type {} from "@itenthusiasm/custom-elements/types/vue.d.ts";
import FormValidityObserverVueTest from "./FormValidityObserverVueTest.vue";
// import JSXTest from "./JSXTest.vue"; // Only for testing JSX + TS in Vue, not forms

if (!customElements.get("checkbox-group")) customElements.define("checkbox-group", CheckboxGroup);
if (!customElements.get("combobox-listbox")) customElements.define("combobox-listbox", ComboboxListbox);
if (!customElements.get("combobox-field")) customElements.define("combobox-field", ComboboxField);
if (!customElements.get("combobox-option")) customElements.define("combobox-option", ComboboxOption);
if (!customElements.get("select-enhancer")) customElements.define("select-enhancer", SelectEnhancer);

createApp(FormValidityObserverVueTest).mount("#app");
// createApp(JSXTest).mount("#app");
