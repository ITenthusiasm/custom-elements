# Select Enhancement in JS Frameworks

We've stated repeatedly that using the `Combobox` component in [`Select Enhancing Mode`](../select-enhancer.md#1-select-enhancing-mode) is the recommended way to use the component for server-rendered applications.[^1] Not only does it make widespread adoption easier in a pre-existing codebase, but it also progressively enhances the native [`<select>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/select) element! This ensures that your forms will _always_ be functional, even when your users don't load your application's JavaScript.

[^1]: `Select Enhancing Mode` is a technique for [progressive enhancement](https://developer.mozilla.org/en-US/docs/Glossary/Progressive_Enhancement). If you are using the `Combobox` componet for a pure SPA that is not server rendered, then it is impossible to progressively enhance your application. In that case, you should use [`Manual Setup Mode`](../select-enhancer.md#2-manual-setup-mode) instead.

`Select Enhancing Mode` enhances the `<select>`/`<option>` elements by replacing them with superior Custom Elements after the page loads (or after the entire component group is connected to the DOM). This approach works well for applications using pure HTML/CSS/JS. However, this technique might confuse JS Frameworks which expect to have _full_ control over what's rendered to the DOM (e.g., [React](https://react.dev/)). Thus, if you want to progressively enhance your forms without confusing your framework, then you'll need to take a slightly different approach.

Because many frameworks (like React) expect to have full control over what's rendered to the DOM, the solution to the progressive enhancement problem in JS frameworks is simple: Do what the `SelectEnhancer` does, but do it _through the framework_ instead of relying on the Custom Element's DOM replacement logic. The `SelectEnhancer` accomplishes progressive enhancement by replacing the `<select>`/`<option>` elements with Custom Elements after the component is mounted to the DOM. We can do the exact same thing using a JS Framework's tooling instead. Here's what that might look like in React:

```tsx
import { createContext, useContext, useState, useEffect } from "react";
import type {} from "@itenthusiasm/custom-elements/Combobox/types/react.d.ts";

const SelectContext = createContext(false);
export default function Select({ children, ...rest }: React.ComponentProps<"combobox-field">) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <SelectContext.Provider value={mounted}>
      {mounted ? (
        <select-enhancer>
          <combobox-field {...rest}></combobox-field>
          <combobox-listbox>{children}</combobox-listbox>
        </select-enhancer>
      ) : (
        <select {...(rest as React.ComponentProps<"select">)}>{children}</select>
      )}
    </SelectContext.Provider>
  );
}

export function Option({ defaultSelected, ...rest }: React.ComponentProps<"combobox-option">) {
  const mounted = useContext(SelectContext);

  if (!mounted) return <option {...(rest as React.ComponentProps<"option">)} selected={defaultSelected} />;
  return <combobox-option {...rest} defaultSelected={defaultSelected} />;
}
```

Note that when React sees a Custom Element which defines _both_ an attribute _and_ a property under the same name (e.g., `selected`), React will always prefer setting the property over setting the attribute. This is problematic because the `selected` _attribute_ of the `ComboboxOption` is what is used to determine the default-selected option. This is a severe limitation in React which will hopefully be resolved in the future. But in the meantime, the `defaultSelected` _property_ can be used to properly configure the default `ComboboxOption`, as shown above. The regular `<option>` element treats `selected` as an attribute in React, so the `defaultSelected` prop is mapped to that attribute.

What's most important about this approach is that it's _simple_ and _declarative_, resulting in easily-maintained code as you write your UIs:

```tsx
import Select, { Option } from "~/my-components/select";

export default function MyForm() {
  const options = ["First", "Second", "Third", "Fourth", "Fifth"];

  return (
    <form>
      <Select name="ranking" filter>
        {options.map((rank, i) => (
          <Option key={rank} value={`${i + 1}`} defaultSelected={i === 2}>
            {rank}
          </Option>
        ))}
      </Select>
    </form>
  );
}
```

Below are examples of how to apply this same technique in other popular JS frameworks.

## [Solid](https://www.solidjs.com/)

```tsx
import { createContext, useContext, onMount, createSignal, splitProps, Switch, Match } from "solid-js";
import type { ComponentProps, Accessor, Context } from "solid-js";
import type {} from "@itenthusiasm/custom-elements/Combobox/types/solid.d.ts";

const SelectContext = createContext() as Context<Accessor<boolean>>;
export default function Select(props: ComponentProps<"combobox-field">) {
  const [local, rest] = splitProps(props, ["children"]);
  const [mounted, setMounted] = createSignal(false);
  onMount(() => setMounted(true));

  return (
    <SelectContext.Provider value={mounted}>
      <Switch>
        <Match when={mounted()}>
          <select-enhancer>
            <combobox-field {...rest}></combobox-field>
            <combobox-listbox>{local.children}</combobox-listbox>
          </select-enhancer>
        </Match>
        <Match when={!mounted()}>
          <select {...(rest as ComponentProps<"select">)}>{local.children}</select>
        </Match>
      </Switch>
    </SelectContext.Provider>
  );
}

export function Option(props: ComponentProps<"combobox-option">) {
  const mounted = useContext(SelectContext);

  return (
    <Switch>
      <Match when={mounted()}>
        <combobox-option {...props} />
      </Match>
      <Match when={!mounted()}>
        <option {...(props as ComponentProps<"option">)} />
      </Match>
    </Switch>
  );
}
```

Note that Solid gives you the freedom to decide whether a component's props will target the underlying element's properties or its attributes. For example, [`bool:*`](https://docs.solidjs.com/reference/jsx-attributes/bool) can be used to force a component to treat a prop like a [boolean attribute](https://developer.mozilla.org/en-US/docs/Glossary/Boolean/HTML). Whether you choose to use the `selected` prop of the `<Option>` component as a JS property or as an attribute is up to you. However, using it as an attribute is recommended for better SSR support:

```tsx
import { For } from "solid-js";
import Select, { Option } from "./components/select";

export default function MyForm() {
  const options = ["First", "Second", "Third", "Fourth", "Fifth"];

  return (
    <form>
      <Select name="ranking" filter>
        <For each={options}>
          {(rank, i) => (
            <Option value={`${i() + 1}`} bool:selected={i() === 2}>
              {rank}
            </Option>
          )}
        </For>
      </Select>
    </form>
  );
}
```

## [Vue](https://vuejs.org/)

In Vue, we'll need to use 3 files:

```vue
<!-- @fallthroughAttributes true -->
<script lang="ts" setup>
/* Select.vue */
import { ref, onMounted, provide, readonly } from "vue";
import { mountedKey } from "./keys.js";

defineOptions({ inheritAttrs: false });

const mounted = ref(false);
onMounted(() => (mounted.value = true));
provide(mountedKey, readonly(mounted));
</script>

<template>
  <select-enhancer v-if="mounted">
    <combobox-field v-bind="$attrs"></combobox-field>
    <combobox-listbox>
      <slot></slot>
    </combobox-listbox>
  </select-enhancer>
  <select v-else v-bind="$attrs">
    <slot></slot>
  </select>
</template>
```

```vue
<!-- @fallthroughAttributes true -->
<script lang="ts" setup>
/* Option.vue */
import { inject } from "vue";
import { mountedKey } from "./keys.js";

const mounted = inject(mountedKey);
</script>

<template>
  <combobox-option v-if="mounted" v-bind="$attrs" :selected.attr="$attrs.selected ? true : undefined">
    <slot></slot>
  </combobox-option>
  <option v-else v-bind="$attrs">
    <slot></slot>
  </option>
</template>
```

```ts
/* keys.js */
import type { InjectionKey, Ref } from "vue";

export const mountedKey = Symbol("mounted") as InjectionKey<Ref<boolean>>;
```

There are a few things to note here:

First, Vue's Web Component support is better than React's, but it is still limited. In order to guarantee that the `selected` _attribute_ is used for the `<combobox-option>` element, we must explicitly use [`:selected.attr`](https://vuejs.org/api/built-in-directives.html#v-bind). (Vue already uses the `selected` attribute for regular `<option>` elements; only `<combobox-option>` is a concern here.) Since Vue doesn't support dynamically binding [_boolean_ attributes](https://developer.mozilla.org/en-US/docs/Glossary/Boolean/HTML), we mimic the behavior of a boolean attribute by toggling between `true` and `undefined` for the `:selected.attr` value.

Second, the [`fallthroughAttributes` Vue Compiler Option](https://github.com/vuejs/language-tools/wiki/Vue-Compiler-Options#fallthroughattributes-v210) enables Vue to infer the proper TypeScript types for the props of the `<Select>` and `<Option>` Vue components. These types are based on where the [fallthrough attributes](https://vuejs.org/guide/components/attrs) are passed.

As with the earlier examples, the Vue components provide a simple and declarative interface for developers.

```vue
<script lang="ts" setup>
import Select from "./components/Select.vue";
import Option from "./components/Option.vue";

const options = ["First", "Second", "Third", "Fourth", "Fifth"];
</script>

<template>
  <form>
    <Select name="ranking" filter>
      <Option v-for="(rank, i) in options" :value="`${i + 1}`" :selected="i === 2">
        {{ rank }}
      </Option>
    </Select>
  </form>
</template>
```

## [Svelte](https://svelte.dev/)

In Svelte, we'll need to use 2 files:

```svelte
<script lang="ts" module>
  /* Select.svelte */
  import { createContext } from "svelte";

  const [getSelectContext, setSelectContext] = createContext<() => boolean>();
  export { getSelectContext };
</script>

<script lang="ts">
  import { onMount } from "svelte";
  import type { HTMLComboboxFieldAttributes } from "svelte/elements";
  import type {} from "@itenthusiasm/custom-elements/Combobox/types/svelte.d.ts";

  let { children, ...rest }: HTMLComboboxFieldAttributes = $props();

  let mounted = $state(false);
  setSelectContext(() => mounted);
  onMount(() => (mounted = true));
</script>

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
```

```svelte
<script lang="ts">
  /* Option.svelte */
  import { onMount } from "svelte";
  import type { HTMLComboboxOptionAttributes } from "svelte/elements";
  import type { ComboboxOption } from "@itenthusiasm/custom-elements/Combobox"
  import { getSelectContext } from "./Select.svelte";

  let { children, ...rest }: HTMLComboboxOptionAttributes = $props();
  const mounted = getSelectContext();

  let customElement: ComboboxOption | HTMLOptionElement;
  onMount(() => (customElement.defaultSelected = Boolean(rest.selected)));
</script>

<svelte:element this={mounted() ? "combobox-option" : "option"} bind:this={customElement} {...rest}>
  {@render children?.()}
</svelte:element>
```

> Note: Importing our library's `svelte.d.ts` file enables you to import the Custom Element attribute types from the `svelte/elements` module.

Unfortunately, although Svelte supports Custom Elements like the other popular frameworks, it struggles even more than React when it comes to handling the `selected` attribute. Similar to React, Svelte translates the `selected` prop on the `<Option>` component to a property instead of an attribute when rendering the `<combobox-option>`. However, unlike React, which supports the `defaultSelected` property, Svelte _does not_ support `defaultSelected` either because it translates the camel case property into a lowercase property (which doesn't exist on the `ComboboxOption` at all).

This is why client-side JS was added to the `<Option>` Svelte component shown above. It gives the `<combobox-option>` the correct default-selected state when it is mounted to the DOM. Note that the `selected` attribute will always be applied properly to the `<option>` element during SSR. So users lacking access to JS will still be able to see the correct default value for the form control.

```svelte
<script lang="ts">
  import Select from "./components/Select.svelte";
  import Option from "./components/Option.svelte";

  const options = ["First", "Second", "Third", "Fourth", "Fifth"];
</script>

<form>
  <Select name="ranking" filter>
    {#each options as rank, i}
      <Option value={`${i + 1}`} selected={i === 2}>
        {rank}
      </Option>
    {/each}
  </Select>
</form>
```

## Other Frameworks

The process for applying Select Enhancement to the `Combobox` component in other JS frameworks is the same as what you saw above: Simply create `<Select>/<Option>` components which render the native `<select>/<option>` elements during SSR, and which render the Custom Elements for the `Combobox` component _after_ your framework has mounted your `<Select>`/`<Option>` components to the DOM.

If you want to support default values for your form control, then you must also ensure that the `selected` _attribute_ is used to determine the default `<option>` during SSR. On the client's side, when the `Combobox` component is mounted to the DOM, you must also ensure that the `selected` attribute is applied to the proper `<combobox-option>`. (You can do this through the literal `selected` attribute. Or, if your framework doesn't support the attribute, you may use the `defaultSelected` property to toggle this attribute instead.)
