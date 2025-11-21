# Combobox

The `Combobox` component is intended to be a drop-in replacement for the native [`<select>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/select) element, but with support for enhnaced features like custom styling and filtering/searching. As a [form-associated component](https://web.dev/articles/more-capable-form-controls), it participates in form validation, form submission, and even the native `<form>` element's `FormData`. The easiest way to use the component is to wrap a `<select>` element in the `<select-enhancer>`:

```html
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

When mounted to the DOM, the `<select-enhancer>` Web Component replaces the `<select>` and `<option>` elements with other components that work together to provide more advanced features like the ones we mentioned earlier:

```html
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

This empowers you to write robust forms that are progressively enhanced. If your users lack access to JavaScript, then your application will fallback to the regular `<select>` element. Otherwise, your users will be provided with a much more powerful [`combobox`](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/). Either way, your forms are _guaranteed_ to remain usable.

> Note: In our documentation, we use `combobox` (lowercase "c") to refer to the accessible [`role`](https://www.w3.org/TR/wai-aria-1.2/#combobox), whereas we use `Combobox` (capital "C") to refer to the [group of components](#component-structure) used by our library to provide an accessible `combobox` to users.

## Component Structure

As you can tell from the above example, our `Combobox` component is really a collection of sub-components which, when properly assembled, function together as a robust `combobox`. There are 4 parts to it:

<dl>
  <dt>
    <a href="./select-enhancer.md"><code>&lt;select-enhancer&gt;</code></a>
  </dt>
  <dd>
    As we mentioned earlier, this component is responsible for swapping the underlying <code>&lt;select&gt;</code>/<code>&lt;option&gt;</code> elements with the appropriate Custom Elements. During this process, all attributes/states are transferred from the <code>&lt;select&gt;</code>/<code>&lt;option&gt;</code> elements to the Custom Elements.
  </dd>

  <dt>
    <a href="./combobox-field.md"><code>&lt;combobox-field&gt;</code></a>
  </dt>
  <dd>
    You can consider this the replacement for the <code>&lt;select&gt;</code> element. It displays the component's current value and acts as a search box when used in <a href="./combobox-field.md#attributes-filter"><code>filter</code> mode</a>. Since it is form-associated, it also holds all of the form-related information for the component group. Its role is <a href="https://www.w3.org/TR/wai-aria-1.2/#combobox"><code>combobox</code></a>.
  </dd>

  <dt>
    <a href="./combobox-listbox.md"><code>&lt;combobox-listbox&gt;</code></a>
  </dt>
  <dd>
    This component acts as an accessible <a href="https://www.w3.org/TR/wai-aria-1.2/#listbox"><code>listbox</code></a> which wraps all of the <code>&lt;combobox-option&gt;</code>s. It is needed to comply with accessibility requirements.
  </dd>

  <dt>
    <a href="./combobox-option.md"><code>&lt;combobox-option&gt;</code></a>
  </dt>
  <dd>
    You can consider this the replacement for the <code>&lt;option&gt;</code> element. Users can update the <code>&lt;combobox-field&gt;</code>'s value by selecting an option with their mouse/keyboard. Its role is <a href="https://www.w3.org/TR/wai-aria-1.2/#option"><code>option</code></a>.
  </dd>
</dl>

To learn more about how each of these Custom Elements operate, visit their corresponding documentation pages (linked above).

Note that the order in which these components are [registered](https://developer.mozilla.org/en-US/docs/Web/API/CustomElementRegistry/define) is important since some of the Custom Elements depend on each other. Below is the required registration order for the `Combobox` component:

```js
import { SelectEnhancer, ComboboxField, ComboboxListbox, ComboboxOption } from "@itenthusiasm/custom-elements";
// or import { SelectEnhancer, ComboboxField, ComboboxListbox, ComboboxOption } from "@itenthusiasm/custom-elements/Combobox";

customElements.define("combobox-listbox", ComboboxListbox);
customElements.define("combobox-field", ComboboxField);
customElements.define("combobox-option", ComboboxOption);
customElements.define("select-enhancer", SelectEnhancer);
```

If you decide to [extend](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/extends) any of these elements with your own Custom Elements that provide extra/modified logic, then you should register them in an order that is analogous to what is shown above.

## Manual Setup Mode

The example HTML displayed at the [beginning](#combobox) of this document showed the `Combobox` component being used in `Select Enhancing Mode`. This mode is recommended because it progressively enhances your forms and is easy to use. However, if you prefer, you are welcome to render the `Combobox` component's "final output" directly instead.

```html
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
```

In this case, the `<select-enhancer>` won't try to swap any elements since everything is already arranged correctly. Instead, it will simply make sure that the `<combobox-field>`, `<combobox-listbox>`, and `<combobox-option>` elements are all initialized in a valid state. **If you are using `Manual Setup Mode`, note that the `<combobox-field>` must always be positioned immediately before the `<combobox-listbox>`**.

## Usage in JS Frameworks

### `Manual Setup Mode` vs. `Select Enhancing Mode`

Some JS Frameworks (such as React) expect to have _full control_ over what's rendered to the DOM. This doesn't matter if you're using `Manual Setup Mode`. However, it is problematic in `Select Enhancing Mode` because the `<select-enhancer>` will manually swap out the `<select>`/`<option>` elements with Custom Elements when this mode is used. This means that another entity _besides_ your JS Framework would be updating the DOM, and it might break your framework's expectations.

If this is a concern, then it's fine to use `Manual Setup Mode` exclusively throughout your application as long as your app does not need progressive enhancement (e.g., it's a SPA with no server rendering). Otherwise, the recommended approach is to render a regular `<select>` element during server rendering, then render the `Combobox` component in `Manual Setup Mode` _after_ the page is hydrated. This enables you to maintain a progressively-enhanced app without breaking your JS framework's expectations. We've demonstrated what this looks like in our [`guides`](./guides#select-enhancement-in-js-frameworks). The process is very straightforward.

### TypeScript Type Inference

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

## Restyling the Component

For simplicity, the `Combobox` component ships with its own default styles via the `@itenthusiasm/custom-elements/Combobox/Combobox.css` file. You're welcome to use this file directly in your application if you like. However, if you intend to modify _any_ of the styles to fit your own needs, then we recommend creating your own CSS file for the `Combobox` component instead, using our styles as an initial template.

There are some minor nuances that come with restyling the component. You can read about them in our [guide](./guides#custom-styling) on applying custom CSS.

## Adding Icons / Buttons

Oftentimes, developers prefer to add items like caret icons to their `combobox`es. The `Combobox` component allows you to do this simply by appending or prepending elements _within_ the `<select-enhancer>`:

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

This works both in `Select Enhancing Mode` and in `Manual Setup Mode`. Additional examples of customizing the `Combobox` component can be found in our [guides](./guides#custom-styling).

## What's Next?

- Dive deeper into the APIs of the different parts of the `Combobox` component:
  - [`<select-enhancer>`](./select-enhancer.md)
  - [`<combobox-field>`](./combobox-field.md)
  - [`<combobox-listbox>`](./combobox-listbox.md)
  - [`<combobox-option>`](./combobox-option.md)
- Read our [guides](./guides) to learn more about what you can accomplish with our component.
