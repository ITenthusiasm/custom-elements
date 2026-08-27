/** @jsxImportSource react */
/* eslint-disable no-console */
import { useId, useState, useRef, useCallback } from "react";
import type { MouseEvent } from "react";
import { createPortal } from "react-dom";
import type { MenuElement } from "@itenthusiasm/custom-elements";

export default function MenuExample() {
  /* -------------------- Simple Menu Example -------------------- */
  const menu1Id = useId();
  const [openWithArrows, setOpenWithArrows] = useState(true);

  function handleMenuselect(event: CustomEvent<string>) {
    console.log("`menuselect` event: ", event);
    console.log("Item Selected: ", event.detail);
  }

  /* -------------------- Advanced Menu Example -------------------- */
  /*
   * Clicking any button in the Advanced Menu Example section opens a single, shared menu. The shared menu is re-parented under
   * whichever `<button>` is clicked by portaling it into that button's container and associating the menu with that button.
   */
  const menu2Id = useId();
  /** Tracks the last `<button>` in the "Advanced Menu Example" section that was clicked. */
  const invokerButton = useRef<HTMLButtonElement>(null);
  const mountMenu = useCallback((menu: MenuElement | null) => {
    if (!menu) return; // Necessary due to `react@19`'s Ref Callback Backwards Compatibility

    const button = invokerButton.current as HTMLButtonElement;
    menu.setAttribute("menubutton", button.id);
    button.ariaExpanded = String(true); // NOTE: Manually opening the `menu` is only needed on mount
  }, []);

  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  function handleButtonGroupClick(event: MouseEvent<HTMLElement>) {
    const target = event.target as HTMLElement;
    const button = target.closest("button");
    if (!button) return;

    invokerButton.current = button;
    setAnchor(button.parentElement);
  }

  return (
    <>
      {/* -------------------- Simple Menu Example: Markup -------------------- */}
      <section aria-label="Simple Menu Example" style={{ display: "flex", gap: "16px" }}>
        <div>
          <button
            id={`${menu1Id}-button`}
            type="button"
            aria-controls={menu1Id}
            aria-expanded="false"
            aria-haspopup="menu"
            style={{ display: "inline-block", width: "100px" }}
          >
            Menu
          </button>

          <menu-element
            id={menu1Id}
            menubutton={`${menu1Id}-button`}
            openwitharrows={openWithArrows}
            onmenuselect={handleMenuselect}
          >
            <div role="menuitem" data-action="cut">
              Cut
            </div>
            <div role="menuitem" data-action="copy">
              Copy
            </div>
            <div role="menuitem" data-action="paste">
              Paste
            </div>
            <div role="menuitem" data-action="save-as">
              Save As...
            </div>
            <div role="menuitem" data-action="print">
              Print
            </div>
          </menu-element>
        </div>

        <button type="button" onClick={() => setOpenWithArrows((value) => !value)}>
          {`Open with Arrows: ${openWithArrows ? "On" : "Off"}`}
        </button>
      </section>

      <hr />

      {/* -------------------- Advanced Menu Example: Markup -------------------- */}
      <section
        aria-label="Advanced Menu Example"
        style={{ display: "flex", gap: "16px" }}
        onClick={handleButtonGroupClick}
      >
        {["Open a Menu Here!", "No, No! Here!", "Over Here!"].map((name, i) => {
          const buttonId = `${menu2Id}-button-${i + 1}`;
          return (
            <div key={name}>
              <button id={buttonId} type="button" aria-controls={menu2Id} aria-expanded="false" aria-haspopup="menu">
                {name}
              </button>
            </div>
          );
        })}

        {anchor &&
          createPortal(
            <menu-element ref={mountMenu} id={menu2Id} onmenuselect={handleMenuselect}>
              <div role="menuitem" data-action="1">
                Action 1
              </div>
              <div role="menuitem" data-action="2">
                Action 2
              </div>
              <div role="menuitem" data-action="3">
                Action 3
              </div>
            </menu-element>,
            anchor,
          )}
      </section>
    </>
  );
}
