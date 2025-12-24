/** @jsxImportSource solid-js */
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
