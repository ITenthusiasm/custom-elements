{#if mounted}
  <select-enhancer>
    <combobox-field {...rest}></combobox-field>
    <combobox-listbox>
      {@render children?.()}
    </combobox-listbox>
  </select-enhancer>
{:else}
  <select {...(rest as HTMLComboboxFieldAttributes<HTMLSelectElement>)}>
    {@render children?.()}
  </select>
{/if}

<script lang="ts" module>
  import { createContext } from "svelte";

  const [getSelectContext, setSelectContext] = createContext<() => boolean>();
  export { getSelectContext };
</script>

<script lang="ts">
  import { onMount } from "svelte";
  import type { HTMLComboboxFieldAttributes } from "svelte/elements";

  let { children, ...rest }: HTMLComboboxFieldAttributes = $props();

  let mounted = $state(false);
  setSelectContext(() => mounted);
  onMount(() => (mounted = true));
</script>
