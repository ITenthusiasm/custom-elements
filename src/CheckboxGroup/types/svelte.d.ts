import type { CheckboxGroup } from "../index.js";

declare module "svelte/elements" {
  interface SvelteHTMLElements {
    "checkbox-group": HTMLCheckboxGroupAttributes;
  }

  interface HTMLCheckboxGroupAttributes extends HTMLAttributes<CheckboxGroup> {
    value?: CheckboxGroup["value"] | null;
    name?: CheckboxGroup["name"] | null;
    disabled?: CheckboxGroup["disabled"] | null;
    required?: CheckboxGroup["required"] | null;
    min?: CheckboxGroup["min"] | number | null;
    max?: CheckboxGroup["max"] | number | null;
    manual?: CheckboxGroup["manual"] | null;
    valuemissingerror?: CheckboxGroup["valueMissingError"] | null;
    rangeunderflowerror?: CheckboxGroup["rangeUnderflowError"] | null;
    rangeoverflowerror?: CheckboxGroup["rangeOverflowError"] | null;
  }
}
