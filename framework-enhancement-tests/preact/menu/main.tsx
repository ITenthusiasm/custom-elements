/** @jsxImportSource preact */
import { render } from "preact";
import { MenuElement } from "@itenthusiasm/custom-elements";
import type {} from "@itenthusiasm/custom-elements/types/preact.d.ts";
import MenuExample from "./MenuExample.jsx";

if (!customElements.get("menu-element")) customElements.define("menu-element", MenuElement);

render(<MenuExample />, document.getElementById("app")!);
