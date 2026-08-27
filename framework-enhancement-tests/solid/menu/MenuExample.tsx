/** @jsxImportSource solid-js */
/* eslint-disable no-console */
import { createUniqueId, createSignal, createEffect, Show, For } from "solid-js";
import { Portal } from "solid-js/web";
import type { MenuElement } from "@itenthusiasm/custom-elements";

export default function MenuExample() {
  /* -------------------- Simple Menu Example -------------------- */
  const menu1Id = createUniqueId();
  const [openWithArrows, setOpenWithArrows] = createSignal(true);

  function handleMenuselect(event: CustomEvent<string>) {
    console.log("`menuselect` event: ", event);
    console.log("Item Selected: ", event.detail);
  }

  /* -------------------- Advanced Menu Example -------------------- */
  /*
   * Clicking any button in the Advanced Menu Example section opens a single, shared menu. The shared menu is re-parented under
   * whichever `<button>` is clicked by portaling it into that button's container and associating the menu with that button.
   */
  let menu2!: MenuElement;
  const menu2Id = createUniqueId();
  /** Tracks the last `<button>` in the "Advanced Menu Example" section that was clicked. */
  let invokerButton: HTMLButtonElement;
  const [anchor, setAnchor] = createSignal<HTMLElement | null>(null);

  function handleButtonGroupClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const button = target.closest("button");
    if (!button) return;

    invokerButton = button;
    setAnchor(button.parentElement);
  }

  createEffect(() => {
    if (!anchor()) return; // The `menu` element hasn't been anchored anywhere in response to a button click yet

    menu2.setAttribute("menubutton", invokerButton.id);
    invokerButton.ariaExpanded = String(true); // NOTE: Manually opening the `menu` is only needed when it relocates
  });

  return (
    <>
      {/* -------------------- Simple Menu Example: Markup -------------------- */}
      <section aria-label="Simple Menu Example" style="display: flex; gap: 16px">
        <div>
          <button
            id={`${menu1Id}-button`}
            type="button"
            aria-controls={menu1Id}
            aria-expanded="false"
            aria-haspopup="menu"
            style="display: inline-block; width: 100px"
          >
            Menu
          </button>

          <menu-element
            id={menu1Id}
            attr:menubutton={`${menu1Id}-button`}
            bool:openwitharrows={openWithArrows()}
            onmenuselect={handleMenuselect}
            // Alternatives for Event Handling:
            // --------------------------------
            // onmenuselect={[
            //   (data, event) => {
            //     console.log("Menu's Opener: ", event.currentTarget.menuButtonElement);
            //     console.log("Solid JS Data: ", data);
            //   },
            //   "Hello World!",
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

        <button type="button" onClick={() => setOpenWithArrows((value) => !value)}>
          {`Open with Arrows: ${openWithArrows() ? "On" : "Off"}`}
        </button>
      </section>

      <hr />

      {/* -------------------- Advanced Menu Example: Markup -------------------- */}
      <section aria-label="Advanced Menu Example" style="display: flex; gap: 16px" onClick={handleButtonGroupClick}>
        <For each={["Open a Menu Here!", "No, No! Here!", "Over Here!"]}>
          {(name, i) => {
            const buttonId = () => `${menu2Id}-button-${i() + 1}`;
            return (
              <div>
                <button
                  id={buttonId()}
                  type="button"
                  aria-controls={menu2Id}
                  aria-expanded="false"
                  aria-haspopup="menu"
                >
                  {name}
                </button>
              </div>
            );
          }}
        </For>

        <Show when={anchor()} keyed>
          {(mount) => (
            <Portal mount={mount}>
              <menu-element ref={menu2} id={menu2Id} onmenuselect={handleMenuselect}>
                <div role="menuitem" data-action="1">
                  Action 1
                </div>
                <div role="menuitem" data-action="2">
                  Action 2
                </div>
                <div role="menuitem" data-action="3">
                  Action 3
                </div>
              </menu-element>
            </Portal>
          )}
        </Show>
      </section>
    </>
  );
}
