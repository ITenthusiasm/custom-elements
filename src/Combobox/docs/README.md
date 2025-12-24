# Combobox

The `Combobox` component[^1] is intended to be a drop-in replacement for the native [`<select>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/select) element, but with support for enhnaced features like custom styling and filtering/searching. As a [form-associated component](https://web.dev/articles/more-capable-form-controls), it participates in form validation, form submission, and even the native `<form>` element's `FormData`.

[^1]: Note: In our documentation, we use `combobox` (lowercase "c") to refer to the accessible `combobox` [`role`](https://www.w3.org/TR/wai-aria-1.2/#combobox), whereas we use `Combobox` (capital "C") to refer to the [group of custom elements](#component-structure) in our library which together form one component that functions as an accessible `combobox` for users.

Below is an example of the component's usage:

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

## Component Structure

As you can tell from the above example, our `Combobox` component is really a collection of sub-components which, when properly assembled, function together as a robust `combobox`. There are 4 parts to it:

<dl>
  <dt>
    <a href="./select-enhancer.md"><code>&lt;select-enhancer&gt;</code></a>
  </dt>
  <dd>
    <p>
      This Custom Element is responsible for guaranteeing that the <code>&lt;combobox-field&gt;</code>, <code>&lt;combobox-listbox&gt;</code>, and <code>&lt;combobox-option&gt;</code> elements are initialized and arranged correctly so that the entire group of Custom Elements function together as an accessible <a href="https://www.w3.org/TR/wai-aria-1.2/#combobox"><code>combobox</code></a>.
    </p>
  </dd>

  <dt>
    <a href="./combobox-field.md"><code>&lt;combobox-field&gt;</code></a>
  </dt>
  <dd>
    You can consider this the replacement for the <code>&lt;select&gt;</code> element. It displays the component's current value and acts as a search box when used in <a href="./combobox-field.md#attributes-filter"><code>filter</code> mode</a>. Since it is form-associated, it also holds all of the form-related information for the <code>Combobox</code> component. Its role is <a href="https://www.w3.org/TR/wai-aria-1.2/#combobox"><code>combobox</code></a>.
  </dd>

  <dt>
    <a href="./combobox-listbox.md"><code>&lt;combobox-listbox&gt;</code></a>
  </dt>
  <dd>
    This Custom Element acts as an accessible <a href="https://www.w3.org/TR/wai-aria-1.2/#listbox"><code>listbox</code></a> which wraps all of the <code>&lt;combobox-option&gt;</code>s. It is needed to comply with accessibility requirements.
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

## Select Enhancing Mode

The example HTML displayed at the [beginning](#combobox) of this document showed the `Combobox` component being used in `Manual Setup Mode`. In `Manual Setup Mode`, the Custom Elements which make up the `Combobox` component are rendered directly to the DOM. This is recommended for SPAs.

If your application is server-rendered and you would like the component to be [progressively enhanced](https://developer.mozilla.org/en-US/docs/Glossary/Progressive_Enhancement), you can use it in `Select Enhancing Mode` instead. This mode is engaged by wrapping a regular [`<select>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/select) element with the `<select-enhancer>`:

```html
<select-enhancer>
  <select id="rank" name="rank" filter>
    <option value="1">First</option>
    <option value="2">Second</option>
    <option value="3">Third</option>
    <option value="4">Fourth</option>
    <option value="5" selected>Fifth</option>
  </select>
</select-enhancer>
```

In this case, the `<select-enhancer>` will swap the `<select>` and `<option>` elements with the appropriate `<combobox-field>`, `<combobox-listbox>`, and `<combobox-option>` elements when the page loads, copying over all relevant attributes, values, and form states in the process.

```html
<select-enhancer>
  <combobox-field id="rank" name="rank" filter></combobox-field>
  <combobox-listbox>
    <combobox-option value="1">First</combobox-option>
    <combobox-option value="2">Second</combobox-option>
    <combobox-option value="3">Third</combobox-option>
    <combobox-option value="4">Fourth</combobox-option>
    <combobox-option value="5" selected>Fifth</combobox-option>
  </combobox-listbox>
</select-enhancer>
```

> If the elements are initially created _outside_ of the DOM, then the `<select-enhancer>` will perform this action when the elements are first mounted to the DOM instead.

`Select Enhancing Mode` is great for situations where you want your form to remain usable for people who have JS Disabled (or who fail to download it for any other reason).

Note that because `Select Enhancing Mode` manipulates the DOM to provide progressive enhancement, you should be careful when using this mode in JS Frameworks that expect to have _full_ control over the DOM. In general, if your list of `option`s is static, then `Select Enhancing Mode` should be safe to use regardless of which JS Framework you're using. However, if your `option`s are _dynamic_, then you should consider rendering a regular `<select>` element on initial render, then a `Manual Setup Mode` Combobox component after initial render. Examples of this can be found in our [guides](./guides/select-enhancement-in-js-frameworks.md).

## TypeScript Type Inference in JS Frameworks

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
// etc. ...
```

## Restyling the Component

For simplicity, the `Combobox` component ships with its own default styles via the `@itenthusiasm/custom-elements/Combobox/Combobox.css` file. You're welcome to use this file directly in your application if you like. However, if you intend to modify _any_ of the styles to fit your own needs, then we recommend creating your own CSS file for the `Combobox` component instead, using our styles as an initial template.

There are some minor nuances that come with restyling the component. You can read about them in our [guide](./guides/styling-the-combobox.md) on applying custom CSS.

## Adding Icons / Buttons

Oftentimes, developers prefer to add items like caret icons to their `combobox`es. The `Combobox` component allows you to do this by simply appending or prepending elements _within_ the `<select-enhancer>`:

```html
<!-- Manual Setup Mode -->
<select-enhancer>
  <combobox-field name="numbers"></combobox-field>
  <combobox-listbox>
    <combobox-option>1</combobox-option>
    <combobox-option>2</combobox-option>
    <combobox-option>3</combobox-option>
  </combobox-listbox>

  <svg viewBox="0 0 100 100"><!-- Caret Icon SVG Elements ... --></svg>
</select-enhancer>

<!-- Select Enhancing Mode -->
<select-enhancer>
  <select name="numbers">
    <option>1</option>
    <option>2</option>
    <option>3</option>
  </select>

  <svg viewBox="0 0 100 100"><!-- Caret Icon SVG Elements ... --></svg>
</select-enhancer>
```

Additional examples of customizing the `Combobox` component's appearance can be found in our [guides](./guides/styling-the-combobox.md).

## What's Next?

- Dive deeper into the APIs of the different parts of the `Combobox` component:
  - [`<select-enhancer>`](./select-enhancer.md)
  - [`<combobox-field>`](./combobox-field.md)
  - [`<combobox-listbox>`](./combobox-listbox.md)
  - [`<combobox-option>`](./combobox-option.md)
- Read our [guides](./guides) to learn more about what you can accomplish with our component.
