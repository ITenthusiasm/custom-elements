<script lang="ts">
  import type { MenuElement } from "@itenthusiasm/custom-elements";

  /* -------------------- Simple Menu Example -------------------- */
  const idBase = $props.id();
  const menu1Id = $derived(`${idBase}-menu-1`);
  let openWithArrows = $state(true);

  function handleMenuselect(event: CustomEvent<string>) {
    console.log("`menuselect` event: ", event);
    console.log("Item Selected: ", event.detail);
  }

  /* -------------------- Advanced Menu Example -------------------- */
  /*
   * Clicking any button in the Advanced Menu Example section opens a single, shared menu. The shared menu is re-parented under
   * whichever `<button>` is clicked by re-anchoring it to that button's container and associating the menu with that button.
   */
  const menu2Id = $derived(`${idBase}-menu-2`);
  function handleButtonGroupClick(event: MouseEvent) {
    const menubutton = (event.target as HTMLElement).closest("button");
    if (!menubutton) return;

    const menu2 = document.getElementById(menu2Id) as MenuElement;
    const anchor = menubutton.parentElement as HTMLElement;
    if (anchor.contains(menu2)) return; // The `menu` has already been anchored here

    // Re-anchor the `menu` and associate it with the new `<button>`.
    menu2.setAttribute("menubutton", menubutton.id);
    menu2.setAttribute("menuanchor", anchor.id);
    menubutton.ariaExpanded = String(true); // NOTE: Manually opening the `menu` is only needed when it relocates
  }
</script>

<!----------------------- Simple Menu Example: Markup ----------------------->
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
      menubutton={`${menu1Id}-button`}
      openwitharrows={openWithArrows || null}
      onmenuselect={handleMenuselect}
    >
      <div role="menuitem" data-action="cut">Cut</div>
      <div role="menuitem" data-action="copy">Copy</div>
      <div role="menuitem" data-action="paste">Paste</div>
      <div role="menuitem" data-action="save-as">Save As...</div>
      <div role="menuitem" data-action="print">Print</div>
    </menu-element>
  </div>

  <button type="button" onclick={() => (openWithArrows = !openWithArrows)}>
    Open with Arrows: {openWithArrows ? "On" : "Off"}
  </button>
</section>

<hr />

<!----------------------- Advanced Menu Example: Markup ----------------------->
<!-- svelte-ignore a11y_click_events_have_key_events -- Both Lint Rules are irrelevant since this is a delegated listener -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<section aria-label="Advanced Menu Example" style="display: flex; gap: 16px" onclick={handleButtonGroupClick}>
  {#each ["Open a Menu Here!", "No, No! Here!", "Over Here!"] as name, i (name)}
    <div id={`${menu2Id}-anchor-${i + 1}`}>
      <button
        id={`${menu2Id}-button-${i + 1}`}
        type="button"
        aria-controls={menu2Id}
        aria-expanded="false"
        aria-haspopup="menu"
      >
        {name}
      </button>
    </div>
  {/each}

  <menu-element id={menu2Id} onmenuselect={handleMenuselect}>
    <div role="menuitem" data-action="1">Action 1</div>
    <div role="menuitem" data-action="2">Action 2</div>
    <div role="menuitem" data-action="3">Action 3</div>
  </menu-element>
</section>
