import type { CheckboxGroup } from "../index.js";

declare module "solid-js" {
  namespace JSX {
    interface HTMLElementTags {
      "checkbox-group": CheckboxGroupHTMLAttributes<CheckboxGroup>;
    }

    interface CheckboxGroupHTMLAttributes<T> extends HTMLAttributes<T> {
      value?: CheckboxGroup["value"];
      name?: CheckboxGroup["name"];
      disabled?: CheckboxGroup["disabled"];
      required?: CheckboxGroup["required"];
      min?: CheckboxGroup["min"] | number;
      max?: CheckboxGroup["max"] | number;
      manual?: CheckboxGroup["manual"];
      valuemissingerror?: CheckboxGroup["valueMissingError"];
      "attr:valuemissingerror"?: CheckboxGroup["valueMissingError"];
      rangeunderflowerror?: CheckboxGroup["rangeUnderflowError"];
      "attr:rangeunderflowerror"?: CheckboxGroup["rangeUnderflowError"];
      rangeoverflowerror?: CheckboxGroup["rangeOverflowError"];
      "attr:rangeoverflowerror"?: CheckboxGroup["rangeOverflowError"];
    }

    interface ExplicitBoolAttributes {
      checked?: boolean;
    }
  }
}
