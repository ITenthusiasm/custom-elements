import { createApp } from "vue";
import { MenuElement } from "@itenthusiasm/custom-elements";
import type {} from "@itenthusiasm/custom-elements/types/vue.d.ts";
import MenuExample from "./MenuExample.vue";
// import MenuExample from "./MenuJSXExample.vue";

if (!customElements.get("menu-element")) customElements.define("menu-element", MenuElement);

createApp(MenuExample).mount("#app");
