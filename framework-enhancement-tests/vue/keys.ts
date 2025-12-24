import type { InjectionKey, Ref } from "vue";

export const mountedKey = Symbol("mounted") as InjectionKey<Ref<boolean>>;
