import type { HTMLAttributes, PublicProps, EmitFn } from "vue";
import type { CheckboxGroup } from "../index.js";

declare module "vue" {
  // Helper Types
  type Booleanish = boolean | "true" | "false";
  type VueEmitMap<T extends GlobalEventHandlersEventMap> = EmitFn<{ [K in keyof T]: (event: T[K]) => void }>;
  interface VueGlobalHTMLAttributes extends HTMLAttributes, Omit<PublicProps, "class" | "style"> {}

  /* -------------------- Register Elements -------------------- */
  interface GlobalComponents {
    "checkbox-group": new () => CheckboxGroupVueSFCType;
  }

  interface IntrinsicElementAttributes {
    "checkbox-group": CheckboxGroupHTMLAttributes;
  }

  /* -------------------- Checkbox Group -------------------- */
  interface CheckboxGroupHTMLAttributes extends VueGlobalHTMLAttributes {
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

  interface CheckboxGroupVueSFCType extends CheckboxGroup {
    /** @deprecated Only for use by Vue's templating language */
    $props: CheckboxGroupHTMLAttributes;

    /** @deprecated Only for use by Vue's templating language */
    $emit: VueEmitMap<HTMLElementEventMap>;
  }
}
