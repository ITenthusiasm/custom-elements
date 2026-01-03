import type { CheckboxGroup } from "../index.js";

declare module "preact" {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- Necessary for type declaration merging
  namespace JSX {
    interface IntrinsicElements {
      "checkbox-group": CheckboxGroupHTMLAttributes<CheckboxGroup>;
    }

    interface CheckboxGroupHTMLAttributes<T extends EventTarget = CheckboxGroup> extends HTMLAttributes<T> {
      value?: Signalish<CheckboxGroup["value"] | undefined>;
      name?: Signalish<CheckboxGroup["name"] | undefined>;
      disabled?: Signalish<CheckboxGroup["disabled"] | undefined>;
      required?: Signalish<CheckboxGroup["required"] | undefined>;
      min?: Signalish<CheckboxGroup["min"] | number | undefined>;
      max?: Signalish<CheckboxGroup["max"] | number | undefined>;
      manual?: Signalish<CheckboxGroup["manual"] | undefined>;
      valuemissingerror?: Signalish<CheckboxGroup["valueMissingError"] | undefined>;
      rangeunderflowerror?: Signalish<CheckboxGroup["rangeUnderflowError"] | undefined>;
      rangeoverflowerror?: Signalish<CheckboxGroup["rangeOverflowError"] | undefined>;
    }
  }
}
