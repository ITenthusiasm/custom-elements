<script lang="ts">
  import type { ComboboxField } from "@itenthusiasm/custom-elements";
  import { fetchPokemon, defaultTimeout } from "./data/pokemon.js";
  import type { Pokemon } from "./data/pokemon.js";

  /* -------------------- Manage Async Options -------------------- */
  let options = $state.raw<Pokemon[]>([]);

  let timeout: number | undefined;
  let controller: AbortController | undefined;
  async function handleFilterchange(event: Event): Promise<void> {
    event.preventDefault();
    controller?.abort(); // Cancel the currently-pending request if one exists
    clearTimeout(timeout); // Debounce the event handler

    const comboboxField = event.currentTarget as ComboboxField;
    comboboxField.setAttribute("data-status", "idle");

    controller = new AbortController();
    timeout = window.setTimeout(async () => {
      const search = comboboxField.text.data;
      if (!search) {
        comboboxField.setAttribute("data-status", "success");
        options = [];
        return;
      }

      comboboxField.setAttribute("data-status", "pending");
      try {
        const pokemon = await fetchPokemon(search, { signal: controller?.signal });
        options = pokemon;
        comboboxField.setAttribute("data-status", "success");
      } catch (_err) {
        // Handle `abort`ed Requests or Request failures here as desired
      }
    }, 1000);
  }

  /* -------------------- Useful Event Handlers -------------------- */
  /** Tracks the user's most recently-selected value */
  function handleChange(event: Event): void {
    const comboboxField = event.currentTarget as ComboboxField;
    if (comboboxField.text.data === "") return comboboxField.setAttribute("data-last-pokemon", "");

    const currentOption = comboboxField.getOptionByValue(comboboxField.value as string);
    if (comboboxField.matches(":focus") && currentOption) {
      comboboxField.setAttribute("data-last-pokemon", currentOption.label);
    }
  }

  /** Restores the `combobox` to a proper state on `collapse` */
  function handleToggle(event: ToggleEvent) {
    if (event.newState !== "closed") return;

    // Cancel any pending operations
    controller?.abort();
    clearTimeout(timeout);

    // Restore the last user-selected value on `collapse` (or clear it if the user deleted it)
    const comboboxField = event.currentTarget as ComboboxField;
    comboboxField.value = comboboxField.getAttribute("data-last-pokemon") ?? "";

    // Force cursor to end if the `combobox` still has focus
    if (!comboboxField.matches(":focus")) return;
    const selection = document.getSelection();
    const { text } = comboboxField;
    selection?.setBaseAndExtent(text, text.length, text, text.length);
  }

  /** Blocks the `Enter` key while `option`s are loading */
  function handleKeydown(event: KeyboardEvent): void {
    const comboboxField = event.currentTarget as ComboboxField;
    const status = comboboxField.getAttribute("data-status");
    if (event.key === "Enter" && status !== "success") event.preventDefault();
  }
</script>

<form>
  <div class="form-field">
    <label for="pokemon">Pokemon</label>
    <select-enhancer>
      <!-- NOTE: For some reason, Svelte struggles with dynamic Custom Elements rendered from components. -->
      <!-- React and Solid do not have this problem. Maybe raise a GitHub Issue. -->

      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <!-- svelte-ignore element_invalid_self_closing_tag -->
      <combobox-field
        id="pokemon"
        name="pokemon"
        filter
        valueis="anyvalue"
        onchange={handleChange}
        ontoggle={handleToggle}
        onkeydown={handleKeydown}
        onfilterchange={handleFilterchange}
      />

      <combobox-listbox>
        {#each options as pokemon (pokemon.id)}
          <combobox-option value={pokemon.id}>{pokemon.name}</combobox-option>
        {/each}
      </combobox-listbox>
    </select-enhancer>
  </div>

  <div class="form-field">
    <label for="timeout">Timeout</label>
    <input id="timeout" name="timeout" type="number" placeholder={String(defaultTimeout)} />
  </div>
</form>
