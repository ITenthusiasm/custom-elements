// NOTE: For some reason, TS complains in the JS files if we export a `type`, so we're exporting `interface`s instead.
/* eslint @typescript-eslint/no-empty-object-type: ["error", { "allowInterfaces": "with-single-extends" }] */
export interface ExposedInternals extends Pick<
  ElementInternals,
  "labels" | "form" | "validity" | "validationMessage" | "willValidate" | "checkValidity" | "reportValidity"
> {}

export interface FieldPropertiesAndMethods extends Pick<
  HTMLInputElement,
  "name" | "required" | "disabled" | "setCustomValidity"
> {}

export interface FieldMinMax extends Pick<HTMLInputElement, "min" | "max"> {}
