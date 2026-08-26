<script lang="ts">
  const idBase = $props.id();
  const menuId = $derived(`${idBase}-menu`);
  const menubuttonId = $derived(`${idBase}-button`);
  let openWithArrows = $state(true);

  function handleMenuselect(event: CustomEvent<string>) {
    console.log("`menuselect` event: ", event);
    console.log("Item Selected: ", event.detail);
  }
</script>

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
      menubutton={menubuttonId}
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

  <div>
    <button type="button" onclick={() => (openWithArrows = !openWithArrows)}>
      Open with Arrows: {openWithArrows ? "On" : "Off"}
    </button>
  </div>
</section>
