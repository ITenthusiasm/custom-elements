import type { HTMLAttributes, PublicProps, EmitFn } from "vue";
import type { PseudoBackdrop } from "../index.js";

declare module "vue" {
  // Helper Types
  type Booleanish = boolean | "true" | "false";
  type VueEmitMap<T extends GlobalEventHandlersEventMap> = EmitFn<{ [K in keyof T]: (event: T[K]) => void }>;
  interface VueGlobalHTMLAttributes extends HTMLAttributes, Omit<PublicProps, "class" | "style"> {}

  /* -------------------- Register Elements -------------------- */
  interface GlobalComponents {
    "pseudo-backdrop": new () => PseudoBackdropVueSFCType;
  }

  interface IntrinsicElementAttributes {
    "pseudo-backdrop": PseudoBackdropHTMLAttributes;
  }

  /* -------------------- Pseudo Backdrop -------------------- */
  interface PseudoBackdropHTMLAttributes extends VueGlobalHTMLAttributes {
    animates?: PseudoBackdrop["animates"];
  }

  interface PseudoBackdropVueSFCType extends PseudoBackdrop {
    /** @deprecated Only for use by Vue's templating language */
    $props: PseudoBackdropHTMLAttributes;

    /** @deprecated Only for use by Vue's templating language */
    $emit: VueEmitMap<HTMLElementEventMap>;
  }
}
