# Combobox

A robust, accessible and stylable [`combobox`](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) [Web Component](https://developer.mozilla.org/en-US/docs/Web/API/Web_components) whose functionality can be extended or customized with ease.

## Features and Benefits

- **Framework Agnostic**: Because this `combobox` is just a custom `HTMLElement`, it works seamlessly in all JS Frameworks (and in pure-JS applications if that's what you fancy).
- **Integrates with Native Web Forms**: This `combobox` [integrates](https://web.dev/articles/more-capable-form-controls) with the web's native `<form>` element, meaning that its value will be seen in the form's [`FormData`](https://developer.mozilla.org/en-US/docs/Web/API/FormData) and will be automatically [sent to the server](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms/Sending_and_retrieving_form_data) when the form is submitted -- all without writing a single line of JS.
- **Works with Various Form Libraries**: The `combobox` emits standard DOM events like [`input`](https://developer.mozilla.org/en-US/docs/Web/API/Element/input_event) and [`change`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/change_event), enabling it to work naturally with reputable form libraries (e.g., the [`Form Observer`](https://github.com/enthusiastic-js/form-observer), [`Conform`](https://conform.guide/), and [`React Hook Form`](https://react-hook-form.com/)).
- **Progressive Enhacement**: When used in [`Select Enhacing Mode`](#select-enhancing-mode), the component will fallback to a regular `<select>` element if JS is disabled or unavailable for your users. This means your forms will _always_ be fully usable and accessible.
- **Highly Customizable**: The `combobox` is flexible enough to work with whatever CSS you provide, and its functionality can be enhanced or overriden through [class extension](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/extends).
- **Performant**: Unlike many other alternatives, the `combobox` has been cleverly designed to work without complex state management tools or aggressively recurring DOM Tree manipulation. This makes it a fast and memory-efficient solution.
- **No Dependencies**: The `combobox` is built on the native web platform instead of extending other frameworks or libraries, guaranteeing your bundle size remains as small as possible.

<!-- TODO: Link to article explaining how progressively-enhanced Form Controls _greatly_ simplify frontend code. -->

## Install

```
npm install @itenthusiasm/custom-elements
```

## Quickstart

```html
<!-- HTML -->
<form>
  <label for="rating">Rating</label>
  <select-enhancer>
    <combobox-field id="rating" name="rating"></combobox-field>
    <combobox-listbox>
      <combobox-option>1</combobox-option>
      <combobox-option>2</combobox-option>
      <combobox-option>3</combobox-option>
      <combobox-option>4</combobox-option>
      <combobox-option selected>5</combobox-option>
    </combobox-listbox>
  </select-enhancer>
</form>
```

```js
/* JavaScript */
import { SelectEnhancer, ComboboxField, ComboboxListbox, ComboboxOption } from "@itenthusiasm/custom-elements";
// or import { SelectEnhancer, ComboboxField, ComboboxListbox, ComboboxOption } from "@itenthusiasm/custom-elements/Combobox";

// NOTE: The order in which these Custom Elements are registered is important
customElements.define("combobox-listbox", ComboboxListbox);
customElements.define("combobox-field", ComboboxField);
customElements.define("combobox-option", ComboboxOption);
customElements.define("select-enhancer", SelectEnhancer);

// Retrieve some info about the `combobox`
const form = document.querySelector("form");
const formData = new FormData(form);
console.log(formData.get("rating")); // 5

const combobox = document.querySelector("combobox-field");
console.log(combobox.form === form); // true
console.log(combobox.value); // 5
```

To use the component's built-in styles, you can use our `Combobox.css` file. If you're using a bundler like Vite, you can just import this directly into one of your JS files.

```js
/* JavaScript */
import { SelectEnhancer, ComboboxField, ComboboxListbox, ComboboxOption } from "@itenthusiasm/custom-elements";
import "@itenthusiasm/custom-elements/Combobox/Combobox.css";

// ...
```

If you prefer to load the CSS in a [`<link>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/link) tag (which tends to be more efficient), you can copy the `Combobox.css` file to your project, modify it to look the way you want, and then load the CSS file the regular way in your HTML.

```html
<html>
  <head>
    <link rel="preload" as="style" href="/path/to/my/copy/of/Combobox.css" />
    <!-- ... -->
  </head>

  <!-- ... -->
</html>
```

In most cases, the `ComboboxField` custom element shown above behaves like an _enhanced_ drop-in replacement for the native `HTMLSelectElement`. For example, it exposes a `value` property that can be used to get or set the value of the component. The `combobox`'s value will always be synchronized with the state of its `option`s. (This matches the behavior of the native `<select>` element.) For more details on the component's attributes and properties, see the [documentation](https://github.com/ITenthusiasm/custom-elements/tree/main/src/Combobox/docs/combobox-field.md).

### Select Enhancing Mode

The example HTML displayed at the [beginning](#quickstart) of this document showed the `Combobox` component being used in `Manual Setup Mode`. If you would like the component to be progressively enhanced, you can use it in `Select Enhancing Mode` instead by wrapping a regular [`<select>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/select) element with the `<select-enhancer>`:

```html
<!-- HTML -->
<form>
  <label for="rating">Rating</label>
  <select-enhancer>
    <select id="rating" name="rating">
      <option>1</option>
      <option>2</option>
      <option>3</option>
      <option>4</option>
      <option selected>5</option>
    </select>
  </select-enhancer>
</form>
```

In this case, the `<select-enhancer>` will swap the `<select>` and `<option>` elements with the appropriate `<combobox-field>`, `<combobox-listbox>`, and `<combobox-option>` elements when the page loads, copying over all relevant attributes, values, and form states in the process. If the elements are created _outside_ of the DOM, then the `<select-enhancer>` will perform this action when the elements are first mounted to the DOM instead. `Select Enhancing Mode` is great for situations where you want your form to remain usable for people who have JS Disabled (or who fail to download it for any other reason).

Note that because `Select Enhancing Mode` manipulates the DOM to provide progressive enhancement, you should be careful when using this mode in JS Frameworks that expect to have _full_ control over the DOM. In general, if your list of `option`s is static, then `Select Enhancing Mode` should be safe to use regardless of which JS Framework you're using. However, if your `option`s are _dynamic_, then you should consider rendering a regular `<select>` element on initial render, then a `Manual Setup Mode` Combobox component after initial render. Examples of this can be found in the [documentation](https://github.com/ITenthusiasm/custom-elements/tree/main/src/Combobox/docs/guides#select-enhancement-in-js-frameworks).

## Tips

Below are some quick tips for using the `combobox`. If you want to dive deeper into the component's features, we've laid out all the details of the component's attributes, properties, methods, and more in our [documentation](https://github.com/ITenthusiasm/custom-elements/tree/main/src/Combobox/docs). We've also provided a demo of the component on [`StackBlitz`](https://stackblitz.com/edit/custom-elements-combobox?file=index.html,src%2Fmain.ts).

### Filter Mode

The `combobox` can be made searchable by applying the [`filter`](https://github.com/ITenthusiasm/custom-elements/tree/main/src/Combobox/docs/combobox-field.md#attributes-filter) attribute to it.

```html
<!-- Manual Setup Mode -->
<select-enhancer>
  <combobox-field filter></combobox-field>
  <combobox-listbox>
    <combobox-option value="1">One</combobox-option>
    <combobox-option value="2">Two</combobox-option>
    <combobox-option value="3">Three</combobox-option>
  </combobox-listbox>
</select-enhancer>

<!-- Select Enhancing Mode -->
<select-enhancer>
  <select filter>
    <option value="1">One</option>
    <option value="2">Two</option>
    <option value="3">Three</option>
  </select>
</select-enhancer>
```

Remember that in `Select Enhancing Mode`, all attributes/states will be copied from the `<select>`/`<option>` elements to the `<combobox-field>`/`<combobox-option>` elements on mount / page load.

### Configuring the Allowed Values

When the `combobox` is in `filter` mode, its allowed values can be configured with the [`valueis`](https://github.com/ITenthusiasm/custom-elements/tree/main/src/Combobox/docs/combobox-field.md#attributes-valueis) attribute. (This attribute does nothing if the component is not in `filter` mode.) There are 3 allowed values:

- `unclearable`: The `combobox` can only be given a value that matches one of its `option`s. If the user starts filtering the `option`s and leaves the `combobox` without selecting an `option`, then the searchbox's text will be reset to the label of the currently-selected `option`.
- `clearable` (Default): Same as `unclearable`, except that the `combobox`'s value can be cleared. This can happen if the user empties the searchbox, or if the developer sets the [`ComboboxField.value`](https://github.com/ITenthusiasm/custom-elements/tree/main/src/Combobox/docs/combobox-field.md#properties-value) property to an empty string. When the `combobox`'s value is cleared, the previously-selected `option` will be deselected (if one exists).
- `anyvalue`: The `combobox` accepts any value, even if there is no matching `option`. If the user types into the `combobox` and leaves it without selecting an `option`, then searchbox's text will be left alone, and the `combobox` will adopt the value of the search text. The `combobox`'s value can also be set programmatically to any string.

```html
<!-- Manual Setup Mode -->
<select-enhancer>
  <combobox-field filter valueis="anyvalue"></combobox-field>
  <combobox-listbox>
    <combobox-option value="1">One</combobox-option>
    <combobox-option value="2">Two</combobox-option>
    <combobox-option value="3">Three</combobox-option>
  </combobox-listbox>
</select-enhancer>

<!-- Select Enhancing Mode -->
<select-enhancer>
  <select filter valueis="anyvalue">
    <option value="1">One</option>
    <option value="2">Two</option>
    <option value="3">Three</option>
  </select>
</select-enhancer>
```

Remember that in `Select Enhancing Mode`, all attributes/states will be copied from the `<select>`/`<option>` elements to the `<combobox-field>`/`<combobox-option>` elements on mount / page load.

### TS Usage in Other Frameworks

Many JS frameworks, such as Svelte and React, often define their own "Element Namespaces". Because of this, most frameworks are not able (on their own) to recognize the correct attributes, properties, and event listeners that belong to the Custom Elements which you use. Thankfully, our library ships with TypeScript types that tell the various JS Frameworks about the existence and shape of our Custom Elements. (This also includes types for _enhanced_ elements like the enhanced `<select>` element.) To define _all_ of our library's Custom Elements within a Framework's "Element Namespace", simply import the appropriate type definition file:

```ts
import type {} from "@itenthusiasm/custom-elements/types/react";
// For Svelte: import type {} from "@itenthusiasm/custom-elements/types/svelte";
// For Vue: import type {} from "@itenthusiasm/custom-elements/types/vue";
// etc. ...
```

If you only intend to use _some_ of the Custom Elements provided by this library, then you should only import the types for those components.

```ts
// Define ONLY the `Combobox` component's types in the framework's "Element Namespace"
import type {} from "@itenthusiasm/custom-elements/Combobox/types/react";
// For Svelte: import type {} from "@itenthusiasm/custom-elements/Combobox/types/svelte";
// For Vue: import type {} from "@itenthusiasm/custom-elements/Combobox/types/vue";
```

### Restyling the Component

For simplicity, the `Combobox` component ships with its own default styles via the `@itenthusiasm/custom-elements/Combobox/Combobox.css` file. You're welcome to use this file directly in your application if you like. However, if you intend to modify _any_ of the styles to fit your own needs, then we recommend creating your own CSS file for the component instead, using our styles as an initial template.

There are some minor nuances that come with restyling the component. You can read about them in our [documentation](https://github.com/ITenthusiasm/custom-elements/tree/main/src/Combobox/docs/guides#custom-styling).

### Adding Icons / Buttons

Oftentimes, people prefer to add items like caret icons to their `combobox`es. The `Combobox` component allows you to do this simply by appending or prepending elements within the `<select-enhancer>`:

```html
<select-enhancer>
  <select name="numbers">
    <option>1</option>
    <option>2</option>
    <option>3</option>
  </select>

  <svg viewBox="0 0 100 100"><!-- Caret Icon SVG Elements ... --></svg>
</select-enhancer>
```

This works both in `Select Enhancing Mode` and in `Manual Setup Mode`. Additional examples of customizing the Combobox Component can be found in our [guides](https://github.com/ITenthusiasm/custom-elements/tree/main/src/Combobox/docs/guides#custom-styling).

## What's Next?

To learn more about all that you can accomplish with the `Combobox` component, visit our [documentation](https://github.com/ITenthusiasm/custom-elements/tree/main/src/Combobox/docs). Trust us, you've only seen the beginning of what can be done with this component!

If you're too excited to sit and read, you can also play with our [`StackBlitz` Demo](https://stackblitz.com/edit/custom-elements-combobox?file=index.html,src%2Fmain.ts) to see the `Combobox` component in action.

<!-- TODO: Link to example of styling our `combobox` to look like GitHub's or ShadcnUI's. Probably put it alongside an example of another styling approach. -->

<!-- TODO: Maybe also add some example styles for making the `<select>` look like the `<combobox-field>`? -->
