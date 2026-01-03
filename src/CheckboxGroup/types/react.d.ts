import type { CheckboxGroup } from "../index.js";

declare module "react" {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- Necessary for type declaration merging
  namespace JSX {
    interface IntrinsicElements {
      "checkbox-group": React.DetailedHTMLProps<React.CheckboxGroupHTMLAttributes<CheckboxGroup>, CheckboxGroup>;
    }
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
    rangeunderflowerror?: CheckboxGroup["rangeUnderflowError"];
    rangeoverflowerror?: CheckboxGroup["rangeOverflowError"];
  }
}
