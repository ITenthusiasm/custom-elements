/** @jsxImportSource react */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MenuElement } from "@itenthusiasm/custom-elements";
import MenuExample from "./MenuExample.jsx";

if (!customElements.get("menu-element")) customElements.define("menu-element", MenuElement);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MenuExample />
  </StrictMode>,
);
