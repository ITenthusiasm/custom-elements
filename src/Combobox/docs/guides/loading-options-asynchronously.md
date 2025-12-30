# Loading Options Asynchronously

When you're loading options asynchronously for a `combobox`, you're typically loading only the options which match the user's current filter. In that case, there's no filtering that needs to be done on the client's side because the server has already handled it. All you need to do is replace the old options with the new ones.

Doing this with the `Combobox` component is straightforward. Simply create a [`filterchange`](../combobox-field.md#events-filterchange) event handler that loads the new options (and replaces the old ones) whenever the user's filter changes. In this event handler, you should also call [`event.preventDefault()`](https://developer.mozilla.org/en-US/docs/Web/API/Event/preventDefault) to disable client-side option filtering (since the options provided by the server will already have been filtered).

If you're using pure JS, you can use the DOM APIs directly to perform the option replacement:

```js
document.querySelector("combobox-field").addEventListener("filterchange", async (event) => {
  event.preventDefault();
  const comboboxField = event.currentTarget;
  const search = comboboxField.text.data;

  const response = await fetch(`https://example.com/my-options?search=${search}`);
  const options = await response.json();
  const optionElements = options.map((o) => {
    const element = document.createElement("combobox-option");
    element.textContent = o.label;
    element.value = o.value;
  });

  comboboxField.listbox.replaceChildren(optionElements);
});
```

Of course, there's more than one way to do this with pure JS. (If you're using a tool like [HTMX](https://htmx.org/), there are even more clever techniques that you can apply.) But the above should suffice for your needs. **_Note that for the best User Experience, you should debounce this event handler._** (See [_Eloquent JavaScript_](https://eloquentjavascript.net/3rd_edition/15_event.html#h_AOVmaqj10I) and [MDN](https://developer.mozilla.org/en-US/docs/Glossary/Debounce) if you are unfamiliar with debouncing.)

If you're using the `Combobox` component in a JavaScript framework, then your `filterchange` event handler should update your local state instead of manipulating the DOM directly. This will enable the JS framework to take responsibility for updating the DOM, resulting in more predictable behavior. Below is an example in React:

```tsx
import { useState } from "react";
import type { ComboboxField } from "@itenthusiasm/custom-elements";

function MyForm() {
  type OptionData = { label: string; value: string };
  const [options, setOptions] = useState<OptionData[]>([]);

  function handleFilterchange(event: React.SyntheticEvent<ComboboxField>) {
    event.preventDefault();
    const comboboxField = event.currentTarget;
    const search = comboboxField.text.data;

    const response = await fetch(`https://example.com/my-options?search=${search}`);
    setOptions(await response.json());
  }

  return (
    <form>
      {/* ... Other Elements ... */}

      <select-enhancer>
        <combobox-field filter></combobox-field>
        <combobox-listbox>
          {options.map((o) => (
            <combobox-option value={o.value}>{o.label}</combobox-option>
          ))}
        </combobox-listbox>
      </select-enhancer>

      {/* ... Other Elements ... */}
    </form>
  );
}
```

**_As stated earlier, you should debounce this event handler for the best User Experience_**.

If you deem it profitable, you can also cache the options that you load asynchronously to avoid redundant API requests.

In Pure JS:

```js
/** @type {Map<string, ComboboxOption[]>} */
const cachedOptions = new Map();

document.querySelector("combobox-field").addEventListener("filterchange", async (event) => {
  event.preventDefault();
  const comboboxField = event.currentTarget;
  const search = comboboxField.text.data;
  if (cachedOptions.has(search)) {
    return comboboxField.listbox.replaceChildren(cachedOptions.get(search));
  }

  const response = await fetch(`https://example.com/my-options?search=${search}`);
  const options = await response.json();
  const optionElements = options.map((o) => {
    const element = document.createElement("combobox-option");
    element.textContent = o.label;
    element.value = o.value;
  });

  cachedOptions.set(search, optionElements);
  comboboxField.listbox.replaceChildren(optionElements);
});
```

In React:

```tsx
import { useState, useRef } from "react";
import type { ComboboxField } from "@itenthusiasm/custom-elements";

function MyForm() {
  type OptionData = { label: string; value: string };
  const [options, setOptions] = useState<OptionData[]>([]);
  const cachedOptions = useRef(new Map<string, OptionData[]>());

  function handleFilterchange(event: React.SyntheticEvent<ComboboxField>) {
    event.preventDefault();
    const comboboxField = event.currentTarget;
    const search = comboboxField.text.data;
    const preloadedOptions = cachedOptions.current.get(search);
    if (preloadedOptions) return setOptions(preloadedOptions);

    const response = await fetch(`https://example.com/my-options?search=${search}`);
    const newOptions = await response.json();
    cachedOptions.current.set(search, newOptions);
    setOptions(newOptions);
  }

  return <form>{/* ... Markup ... */}</form>;
}
```

There are additional things that you can do as well, such as [abort your API Request](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal#examples) if the user starts typing again before the last request finishes. Or, if you don't want to worry about interrupting API Requests, then you can prevent the user from sending more option-filtering requests if one is already pending. Whether or not to implement such extra logic is up to each developer.

<!-- TODO: Maybe add a StackBlitz example of loading options asynchronously? -->

## Additional Considerations

### Loading Indicators

When your `combobox` starts loading new options, you should provide a loading indicator to your users which clarifies that they need to wait until the new options have finished loading. After the options have finished loading, this indicator should be removed. You can accomplish this behavior by dynamically inserting/removing text (e.g., "Loading...") into/from the DOM, or by performing clever CSS tricks (e.g., with the [`::before`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/::before)/[`::after`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/::after) selector and the [`content`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/content) CSS property).

Note that the `ComboboxListbox` only allows `ComboboxOption` elements to be inserted into it. Consequently, if you take the dynamic text insertion/removal approach, then your indicator text must appear within the `<select-enhancer>` and outside the `<combobox-listbox>`.

Whatever you do, you should make sure that the old options are _not_ displayed while the new ones are loading. You will need to do this with CSS since the `ComboboxListbox` itself is [toggled with CSS](./styling-the-combobox.md#styling-the-comboboxlistbox).

```css
[role="combobox"][data-loading] + [role="listbox"] {
  display: none;
}
```

Then, in the `filterchange` event handler, you can toggle the `data-loading` attribute as needed.

In Pure JS:

```js
document.querySelector("combobox-field").addEventListener("filterchange", async (event) => {
  event.preventDefault();
  const comboboxField = event.currentTarget;
  const search = comboboxField.text.data;
  comboboxField.toggleAttribute("data-loading", true); // Add loading attribute/styles

  const response = await fetch(`https://example.com/my-options?search=${search}`);
  const options = await response.json();
  const optionElements = options.map((o) => {
    const element = document.createElement("combobox-option");
    element.textContent = o.label;
    element.value = o.value;
  });

  comboboxField.listbox.replaceChildren(optionElements);
  comboboxField.toggleAttribute("data-loading", false); // Remove loading attribute/styles
});
```

In React:

```ts
function handleFilterchange(event: React.SyntheticEvent<ComboboxField>) {
  event.preventDefault();
  const comboboxField = event.currentTarget;
  const search = comboboxField.text.data;
  comboboxField.toggleAttribute("data-loading", true); // Add loading attribute/styles

  const response = await fetch(`https://example.com/my-options?search=${search}`);
  setOptions(await response.json());
  comboboxField.toggleAttribute("data-loading", false); // Remove loading attribute/styles
}
```

If you prefer not to show any options while the `ComboboxField` is "idle", you are welcome to add additional logic to do so. For example, you can mark the `ComboboxField` as `[data-status="idle"]` whenever the user collapses it. When the user starts loading new options, this status can be changed to `[data-status="pending"]`. And when the options finish loading, you can update the status to `[data-status="success"]`. In this case, your CSS would look more like the following:

```css
[role="combobox"]:not([data-status="success"]) + [role="listbox"] {
  display: none;
}
```

Note, however, that it's likely a better UX to let the user see their most-recently-loaded list of options whenever they expand the `ComboboxField`.

One last note: The code that we just showed primarily had to do with _visibly_ hiding options from users with CSS. You might also want to prevent the old options from being accidentally keyboard-selected while the new ones are loading. This is unlikely to be a practical concern, but it still may be of interest for you.

There are multiple ways to handle this. One way is to disable the `ComboboxField` (or the `ComboboxOption`s) while your new options are loading. (If you do the former, you will need to re-focus the `ComboboxField` after the options finish loading. One nice thing about this approach is that it will guarantee that only 1 filtering API request can go out at a time.) Another option is to block the `Enter` key while options are loading. Still, another option is to [extend](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/extends) the `ComboboxField` and override its functionality. (Yes, there are even more options than these. Choose whatever works best for you.)

### The `valueis` Setting

The last matter to consider is the [`valueis`](../combobox-field.md#attributes-valueis) attribute that you use for the `ComboboxField`, as this has important implications for how you should replace your old options when you load new ones.

#### Using `anyvalue` Mode

An `anyvalue` `ComboboxField` will accept whatever the user types as a value. To understand how this plays out when loading options asynchronously, consider the following scenario:

1. A user selects an asynchronously-loaded option.
2. The user loads a new set of options by supplying a different filter.
3. The option that the user previously-selected is removed because it is not included in the newly-loaded list of options.

In this case, the value of the `ComboboxField` will be the filter that was most-recently typed by the user in Step 2. Thus, the user's previously-selected option/value from Step 1 will have been lost.

To preserve the original option/value from Step 1, you can track the user's most-recently selected option in local state. Then, when the user leaves the `ComboboxField` (or submits the form), you can set its value back to the `label` of the previously-selected option. (If the previously-selected option is still in the currently-loaded list of options, then you can set the `ComboboxField`'s value to the option's `value` instead.) This guarantees you that will always know the async option which the user most-recently chose.

#### Using `clearable`/`unclearable` Mode

As the documentation states, a `clearable`/`unclearable` `ComboboxField` _must_ have a value that corresponds to one of its options. (The one exception is that `clearable` `ComboboxField`s can always be given an empty string value.) If an `(un)clearable` `ComboboxField` has no options at all, then its value will be coerced to `null`. (This matches the behavior of the native [`<select>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/select) element, except that the native element uses `""` instead of `null`.) Similarly, if the currently-selected option is removed, then the `ComboboxField` will be [reset to its default value](../combobox-option.md#determining-the-default-option). (This also mimics the behavior of the `<select>` element.)

To understand how this impacts the component's value when loading options asynchronously, let's consider the same scenario as before:

1. A user selects an asynchronously-loaded option.
2. The user loads a new set of options by supplying a different filter.
3. The option that the user previously-selected is removed because it is not included in the newly-loaded list of options.

Here, the user's previously-chosen option/value from Step 1 will be lost because the option was removed in Step 3. For `anyvalue` `ComboboxField`s, we suggested storing the most-recently selected option in local state, then restoring the component's value to that option's label/value when the user leaves the `ComboboxField`. However, this approach won't work for an `(un)clearable` `ComboboxField` if the previously-selected option is not in the newly-loaded list of options (because an `(un)clearable` `ComboboxField` rejects any value that doesn't correspond to an existing option).

In order to preserve the value of the originally-selected option for an `(un)clearable` `ComboboxField`, you must always avoid replacing/removing the originally-selected option when loading a new set of options. This means that after you've loaded a new set of options, you should replace everything _except_ the currently-selected option with the new list of options.

This will likely be helpful for users because they will always be able to see (and/or revert back to) the option which they most-recently selected. However, if you don't prefer this behavior, then we recommend using an `anyvalue` `ComboboxField` for loading options asynchronously instead.

#### Which Mode to Choose

You're free to use any of the 3 `valueis` modes when loading options asynchronously. However, if you're using a `clearable`/`unclearable` `ComboboxField`, then you should replace everything _except_ the currently-selected option whenever you load new options. This is required to preserve the user's most-recently chosen value. By contrast, `anyvalue` `ComboboxField`s do not have this limitation and will typically be easier to use for async option loading.
