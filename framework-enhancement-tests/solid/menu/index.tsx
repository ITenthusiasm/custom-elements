/** @jsxImportSource solid-js */
import { render } from "solid-js/web";
import { MenuElement } from "@itenthusiasm/custom-elements";
import MenuExample from "./MenuExample.jsx";

if (!customElements.get("menu-element")) customElements.define("menu-element", MenuElement);

const root = document.getElementById("root");
render(() => <MenuExample />, root!);
