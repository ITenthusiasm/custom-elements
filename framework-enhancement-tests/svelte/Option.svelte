<svelte:element this={mounted() ? "combobox-option" : "option"} bind:this={customElement} {...rest}>
  {@render children?.()}
</svelte:element>

<script lang="ts">
  import type { HTMLComboboxOptionAttributes } from "svelte/elements";
  import type { ComboboxOption } from "@itenthusiasm/custom-elements/Combobox"
  import { getSelectContext } from "./Select.svelte";

  let { children, ...rest }: HTMLComboboxOptionAttributes = $props();
  let customElement: ComboboxOption | HTMLOptionElement;
  const mounted = getSelectContext();

  $effect(() => {
    if (!mounted() || !customElement) return;
    customElement.defaultSelected = Boolean(rest.selected);
  });
</script>
