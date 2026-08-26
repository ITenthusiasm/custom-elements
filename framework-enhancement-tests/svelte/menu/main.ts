import { mount } from "svelte";
import { MenuElement } from "@itenthusiasm/custom-elements";
import type {} from "@itenthusiasm/custom-elements/types/svelte.d.ts";
import MenuExample from "./MenuExample.svelte";

if (!customElements.get("menu-element")) customElements.define("menu-element", MenuElement);

const app = mount(MenuExample, { target: document.getElementById("app") as HTMLElement });
export default app;
