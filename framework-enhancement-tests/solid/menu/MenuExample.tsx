/** @jsxImportSource solid-js */
/* eslint-disable no-console */
import { createUniqueId, createSignal } from "solid-js";

export default function MenuExample() {
  const menuId = createUniqueId();
  const menubuttonId = createUniqueId();
  const [openWithArrows, setOpenWithArrows] = createSignal(true);

  function handleMenuselect(event: CustomEvent<string>) {
    console.log("`menuselect` event: ", event);
    console.log("Item Selected: ", event.detail);
  }

  return (
    <section style="display: flex; gap: 16px">
      <div>
        <button
          id={menubuttonId}
          type="button"
          aria-controls={menuId}
          aria-expanded="false"
          aria-haspopup="menu"
          style="display: inline-block; width: 100px"
        >
          Menu
        </button>

        <menu-element
          id={menuId}
          attr:menubutton={menubuttonId}
          bool:openwitharrows={openWithArrows()}
          onmenuselect={handleMenuselect}
          // onmenuselect={[
          //   (data, event) => {
          //     console.log("Menu's Opener: ", event.currentTarget.menuButtonElement);
          //     console.log("Solid JS Data: ", data);
          //   },
          //   "RIP!",
          // ]}
          // on:menuselect={handleMenuselect}
          // on:menuselect={{
          //   capture: true,
          //   handleEvent(event) {
          //     console.log("Menu's Opener: ", event.currentTarget.menuButtonElement);
          //   },
          // }}
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

      <div>
        <button type="button" onClick={() => setOpenWithArrows((value) => !value)}>
          {`Open with Arrows: ${openWithArrows() ? "On" : "Off"}`}
        </button>
      </div>
    </section>
  );
}
