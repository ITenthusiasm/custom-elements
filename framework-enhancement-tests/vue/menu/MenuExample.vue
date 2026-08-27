<script lang="ts" setup>
import { useId, ref, watch } from "vue";
import type { MenuElement } from "@itenthusiasm/custom-elements";

/* -------------------- Simple Menu Example -------------------- */
const menu1Id = useId();
const openWithArrows = ref(true);

function handleMenuselect(event: CustomEvent<string>) {
  console.log("`menuselect` event: ", event);
  console.log("Item Selected: ", event.detail);
}

/* -------------------- Advanced Menu Example -------------------- */
/*
 * Clicking any button in the Advanced Menu Example section opens a single, shared menu. The shared menu is re-parented under
 * whichever `<button>` is clicked by teleporting it into that button's container and associating the menu with that button.
 */
const menu2 = ref<MenuElement | null>(null);
const menu2Id = useId();
/** Tracks the last `<button>` in the "Advanced Menu Example" section that was clicked. */
let invokerButton: HTMLButtonElement;
const anchor = ref<HTMLElement | null>(null);

function handleButtonGroupClick(event: MouseEvent) {
  const target = event.target as HTMLElement;
  const button = target.closest("button");
  if (!button) return;

  invokerButton = button;
  anchor.value = button.parentElement;
}

watch(
  anchor,
  (anchorElement) => {
    if (!anchorElement) return; // The `menu` element hasn't been anchored anywhere in response to a button click yet

    (menu2.value as MenuElement).setAttribute("menubutton", invokerButton.id);
    invokerButton.ariaExpanded = String(true); // NOTE: Manually opening the `menu` is only needed when it relocates
  },
  { flush: "post" },
);
</script>

<template>
  <!----------------------- Simple Menu Example: Markup ----------------------->
  <section aria-label="Simple Menu Example" style="display: flex; gap: 16px">
    <div>
      <button
        :id="`${menu1Id}-button`"
        type="button"
        :aria-controls="menu1Id"
        aria-expanded="false"
        aria-haspopup="menu"
        style="display: inline-block; width: 100px"
      >
        Menu
      </button>

      <menu-element
        :id="menu1Id"
        :menubutton="`${menu1Id}-button`"
        :openwitharrows="openWithArrows || undefined"
        @menuselect="handleMenuselect"
      >
        <div role="menuitem" data-action="cut">Cut</div>
        <div role="menuitem" data-action="copy">Copy</div>
        <div role="menuitem" data-action="paste">Paste</div>
        <div role="menuitem" data-action="save-as">Save As...</div>
        <div role="menuitem" data-action="print">Print</div>
      </menu-element>
    </div>

    <button type="button" @click="openWithArrows = !openWithArrows">
      Open with Arrows: {{ openWithArrows ? "On" : "Off" }}
    </button>
  </section>

  <hr />

  <!----------------------- Advanced Menu Example: Markup ----------------------->
  <section aria-label="Advanced Menu Example" style="display: flex; gap: 16px" @click="handleButtonGroupClick">
    <div v-for="(name, i) in ['Open a Menu Here!', 'No, No! Here!', 'Over Here!']" :key="name">
      <button
        :id="`${menu2Id}-button-${i + 1}`"
        type="button"
        :aria-controls="menu2Id"
        aria-expanded="false"
        aria-haspopup="menu"
      >
        {{ name }}
      </button>
    </div>

    <Teleport v-if="anchor" :to="anchor">
      <menu-element ref="menu2" :id="menu2Id" @menuselect="handleMenuselect">
        <div role="menuitem" data-action="1">Action 1</div>
        <div role="menuitem" data-action="2">Action 2</div>
        <div role="menuitem" data-action="3">Action 3</div>
      </menu-element>
    </Teleport>
  </section>
</template>
