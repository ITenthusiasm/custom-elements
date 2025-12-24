# The `SelectEnhancer` Element

The `SelectEnhancer` is a [Custom Element](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements) used by the [`Combobox` component](.)[^1]. It is responsible for guaranteeing that the [`<combobox-field>`](./combobox-field.md), [`<combobox-listbox>`](./combobox-listbox.md), and [`<combobox-option>`](./combobox-option.md) elements are initialized and arranged correctly so that the entire group of Custom Elements function together as an accessible [`combobox`](https://www.w3.org/TR/wai-aria-1.2/#combobox). This initialization is performed in one of two cases: 1&rpar; When the page first loads (if any `<select-enhancer>`s are in the initial markup), or 2&rpar; When the `<select-enhancer>` is mounted to the DOM (if it was originally created outside of the DOM).

[^1]: Note: In our documentation, we use `combobox` (lowercase "c") to refer to the accessible `combobox` [`role`](https://www.w3.org/TR/wai-aria-1.2/#combobox), whereas we use `Combobox` (capital "C") to refer to the [group of custom elements](.#component-structure) in our library which together form one component that functions as an accessible `combobox` for users.

## Modes of Use

There are two modes in which the `SelectEnhancer` can be used: `Select Enhancing Mode` and `Manual Setup Mode`.

### 1&rpar; `Select Enhancing Mode`

`Select Enhancing Mode` is engaged when the `SelectEnhancer` wraps a regular [`<select>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/select) element and is connected to the DOM:

```html
<form>
  <label for="ice-cream">Ice Cream</label>
  <select-enhancer>
    <select id="ice-cream" name="ice-cream">
      <option value="vanilla">Vanilla</option>
      <option value="chocolate" selected>Chocolate</option>
      <option value="strawberry">Strawberry</option>
    </select>
  </select-enhancer>
</form>
```

In this mode, the `<select-enhancer>` replaces the `<select>`/`<option>` elements with their corresponding `<combobox-field>`, `<combobox-listbox>`, and `<combobox-option>` elements. As the `<select-enhancer>` creates these elements, it transfers all attributes/states from the original elements to the Custom Elements:

```html
<form>
  <label for="ice-cream">Rating</label>
  <select-enhancer>
    <combobox-field id="ice-cream" name="ice-cream"></combobox-field>
    <combobox-listbox>
      <combobox-option value="vanilla">Vanilla</combobox-option>
      <combobox-option value="chocolate" selected>Chocolate</combobox-option>
      <combobox-option value="strawberry">Strawberry</combobox-option>
    </combobox-listbox>
  </select-enhancer>
</form>
```

> Note: Even non-standard attributes will be copied over from the `<select>` element to the `<combobox-field>` element. This means, for example, that you can place the [`filter`](./combobox-field.md#attributes-filter) attribute on the `<select>` element to cause the generated `<combobox-field>` element to be initialized in Filter Mode.

`Select Enhancing Mode` is ideal if you want to [progressively enhance](https://developer.mozilla.org/en-US/docs/Glossary/Progressive_Enhancement) a server-rendered application. If your users have JS disabled (or they otherwise [lack access to it](https://www.kryogenix.org/code/browser/everyonehasjs.html)), then they will still be able to use your forms because you'll be rendering regular `<select>` elements on initial page load. _Remember: `<select>` elements don't need JS to work properly_.

The only caveat here is that you'll want to style your `<select>` element(s) to look like the `Combobox` component if you use this mode. That way, users with slower devices or weaker internet connections won't see a [Flash of Unstyled Content](https://en.wikipedia.org/wiki/Flash_of_unstyled_content) (so to speak) when the component is first mounted to the DOM. (Practically speaking, this is unlikely to be a real concern for your app.)

### 2&rpar; `Manual Setup Mode`

`Manual Setup Mode` is engaged when the `SelectEnhancer` is connected to the DOM with the Custom Elements already put in place:

```html
<form>
  <label for="transmission">Car Transmission</label>
  <select-enhancer>
    <combobox-field id="transmission" name="transmission" filter></combobox-field>
    <combobox-listbox>
      <combobox-option value="manual">Manual</combobox-option>
      <combobox-option value="automatic">Automatic</combobox-option>
      <combobox-option value="cvt">CVT</combobox-option>
    </combobox-listbox>
  </select-enhancer>
</form>
```

> Note: The `<combobox-field>` element must always be placed immediately before the `<combobox-listbox>` element.

This mode is called `Manual Setup Mode` because the `<select-enhancer>` doesn't have to swap out any `<select>` or `<option>` elements. Instead, the developer chooses to manually insert and arrange all of the necessary Custom Elements in the markup.

Note that although this mode is called "Manual Setup Mode", there are still some actions that the `<select-enhancer>` will automate in this mode. For example, it will automatically establish the [ARIA](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA) relationships needed to make the component behave as an accessible [`combobox`](https://www.w3.org/TR/wai-aria-1.2/#combobox).

`Manual Setup Mode` is recommended for SPAs because a SPA cannot be progressively enhanced. Thus, it makes more sense to use the Custom Elements directly instead of using `Select Enhancing Mode` in this case.

If you are server-rendering your application with a JS Framework (like React), then instead of using `Select Enhancing Mode`, you should create a helper component that renders a regular `<select>` element during SSR, and then renders a `<select-enhancer>` in `Manual Setup Mode` immediately after your application is first mounted/hydrated. This is to comply with the assumptions that many JS frameworks tend to have. You can find simple examples of this in our [guides](./guides/select-enhancement-in-js-frameworks.md).

## Adding Icons / Buttons to the `SelectEnhancer`

The `SelectEnhancer` applies some _minor_ restrictions regarding its descendants:

- In `Select Enhancing Mode`, it must have an `HTMLSelectElement` as a direct descendant.
- In `Manual Setup Mode`, it must have a `ComboboxField` element and a `ComboboxListbox` element as direct descendants, and the `ComboboxField` element must be placed immediately before the `ComboboxListbox`.

Besides that, there are no rules, and you are free to place whatever you want within the `<select-enhancer>`. This is important, for example, if you want to place a Caret Icon inside the `<select-enhancer>` that rotates when the `<combobox-field>` is expanded:

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

Or you might want to display an `X` button that enables users to clear their selected value:

```html
<!-- HTML -->
<select-enhancer>
  <combobox-field id="movies" name="movies" filter valueis="clearable"></combobox-field>
  <combobox-listbox>
    <combobox-option>Fireproof</combobox-option>
    <combobox-option>Facing the Giants</combobox-option>
    <combobox-option>War Room</combobox-option>
    <combobox-option>Dragon Ball Z: Resurrection F</combobox-option>
    <combobox-option>Road to Ninja: Naruto the Movie</combobox-option>
    <combobox-option>Boruto: Naruto the Movie</combobox-option>
  </combobox-listbox>

  <button type="button" hidden>X</button>
  <svg viewBox="0 0 100 100"><!-- Caret Icon SVG Elements ... --></svg>
</select-enhancer>
```

```js
/* JavaScript */
const combobox = document.querySelector("combobox-field");
const button = document.querySelector("button");

combobox.addEventListener("input", (event) => (button.hidden = !event.target.value));
button.addEventListener("click", () => {
  combobox.forceEmptyValue();
  button.hidden = true;
});
```

There's no limit to what you can do! For additional insights, see our [guide](./guides/styling-the-combobox.md) on customizing the component's appearance.

## Attributes

As a Custom Element, the `SelectEnhancer` supports all of the [global attributes](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes). The attributes which are _specific_ to the `SelectEnhancer` are as follows:

<dl>
  <dt id="attributes-comboboxtag">
    <a href="#attributes-comboboxtag"><code>comboboxtag</code></a>
  </dt>
  <dd>
    <p>
      Determines the HTML Element which will replace the <code>&lt;select&gt;</code> element when the <code>SelectEnhancer</code> is used in <code>Select Enhancing Mode</code>. The value must be an HTML tag name for a Custom Element which is <a href="https://developer.mozilla.org/en-US/docs/Web/API/CustomElementRegistry/define">registered</a> as a valid <a href="./combobox-field.md"><code>ComboboxField</code></a> (or as a Custom Element which extends the <code>ComboboxField</code>). Defaults to <code>combobox-field</code>.
    </p>
    <p>
      This attribute is useful if you prefer to register the <code>ComboboxField</code> Custom Element with a tag name other than <code>combobox-field</code>. You can also use this attribute to point to a Custom Element which <em><a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/extends"><code>extends</code></a></em> the <code>ComboboxField</code>.
    </p>
    <p>This attribute is reflected by the <a href="#properties-comboboxTag"><code>SelectEnhancer.comboboxTag</code></a> property.</p>
  </dd>

  <dt id="attributes-optiontag">
    <a href="#attributes-optiontag"><code>optiontag</code></a>
  </dt>
  <dd>
    <p>
      Determines the HTML Element that will replace the <code>&lt;option&gt;</code> element(s) when the <code>SelectEnhancer</code> is used in <code>Select Enhancing Mode</code>. The value must be an HTML tag name for a Custom Element which is <a href="https://developer.mozilla.org/en-US/docs/Web/API/CustomElementRegistry/define">registered</a> as a valid <a href="./combobox-option.md"><code>ComboboxOption</code></a> (or as a Custom Element which extends the <code>ComboboxOption</code>). Defaults to <code>combobox-option</code>.
    </p>
    <p>This attribute is reflected by the <a href="#properties-optionTag"><code>SelectEnhancer.optionTag</code></a> property.</p>
  </dd>

  <dt id="attributes-listboxtag">
    <a href="#attributes-listboxtag"><code>listboxtag</code></a>
  </dt>
  <dd>
    <p>
      Determines the HTML Element that will wrap the <code>option</code>s when the <code>SelectEnhancer</code> is used in <code>Select Enhancing Mode</code>. The value must be an HTML tag name for a Custom Element which is <a href="https://developer.mozilla.org/en-US/docs/Web/API/CustomElementRegistry/define">registered</a> as a valid <a href="./combobox-listbox.md"><code>ComboboxListbox</code></a> (or as a Custom Element which extends the <code>ComboboxListbox</code>). Defaults to <code>combobox-listbox</code>.
    </p>
    <p>This attribute is reflected by the <a href="#properties-listboxTag"><code>SelectEnhancer.listboxTag</code></a> property.</p>
  </dd>
</dl>

## Properties

As a Custom Element, the `SelectEnhancer` inherits all of the methods and properties of the [`HTMLElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement) interface. The properties which are _specific_ to the `SelectEnhancer` are as follows:

<dl>
  <dt id="properties-comboboxTag">
    <a href="#properties-comboboxTag"><code>comboboxTag</code></a>
  </dt>
  <dd>Reflects the <a href="#attributes-comboboxtag"><code>comboboxtag</code></a> attribute. Type is <code>string</code>.</dd>

  <dt id="properties-optionTag">
    <a href="#properties-optionTag"><code>optionTag</code></a>
  </dt>
  <dd>Reflects the <a href="#attributes-optiontag"><code>optiontag</code></a> attribute. Type is <code>string</code>.</dd>

  <dt id="properties-listboxTag">
    <a href="#properties-listboxTag"><code>listboxTag</code></a>
  </dt>
  <dd>Reflects the <a href="#attributes-listboxtag"><code>listboxtag</code></a> attribute. Type is <code>string</code>.</dd>
</dl>

## Using Other Custom Elements or Tag Names

You're welcome to register the `Combobox` component segments under different tag names if you like:

```js
/* JavaScript */
import { SelectEnhancer, ComboboxField, ComboboxListbox, ComboboxOption } from "@itenthusiasm/custom-elements";
// or import { SelectEnhancer, ComboboxField, ComboboxListbox, ComboboxOption } from "@itenthusiasm/custom-elements/Combobox";

// NOTE: The order in which these Custom Elements are registered is important
customElements.define("x-listbox", ComboboxListbox);
customElements.define("x-combobox", ComboboxField);
customElements.define("x-option", ComboboxOption);
customElements.define("x-enhancer", SelectEnhancer);
```

You'll just need to make sure that your markup is correct if you do so:

```html
<!-- Manual Setup Mode -->
<x-enhancer>
  <x-combobox name="numbers"></x-combobox>
  <x-listbox>
    <x-option>1</x-option>
    <x-option>2</x-option>
    <x-option>3</x-option>
  </x-listbox>
</x-enhancer>

<!-- Select Enhancing Mode-->
<x-enhancer comboboxtag="x-combobox" listboxtag="x-listbox" optiontag="x-option">
  <select name="numbers">
    <option>1</option>
    <option>2</option>
    <option>3</option>
  </select>
</x-enhancer>
```

You can also use your own Custom Elements with the `SelectEnhancer`, as long as they are extensions of the ones provided by the `Combobox` component:

```js
/* JavaScript */
import { SelectEnhancer, ComboboxField, ComboboxListbox, ComboboxOption } from "@itenthusiasm/custom-elements";
// or import { SelectEnhancer, ComboboxField, ComboboxListbox, ComboboxOption } from "@itenthusiasm/custom-elements/Combobox";

class TrieCombobox extends ComboboxField {
  /* ... */
}

class IterableListbox extends ComboboxListbox {
  /* ... */
}

class EnhancedOption extends ComboboxOption {
  /* ... */
}

// NOTE: The order in which these Custom Elements are registered is important
customElements.define("iterable-listbox", IterableListbox);
customElements.define("combobox-field", ComboboxField);
customElements.define("trie-combobox", TrieCombobox);
customElements.define("combobox-option", EnhancedOption);
customElements.define("select-enhancer", SelectEnhancer);
```

```html
<!-- Manual Setup Mode (using `TrieCombobox`) -->
<select-enhancer>
  <trie-combobox name="numbers"></trie-combobox>
  <iterable-listbox>
    <combobox-option>1</combobox-option>
    <combobox-option>2</combobox-option>
    <combobox-option>3</combobox-option>
  </iterable-listbox>
</select-enhancer>

<!-- Select Enhancing Mode (using `ComboboxField`) -->
<select-enhancer listboxtag="iterable-listbox">
  <select name="numbers">
    <option>1</option>
    <option>2</option>
    <option>3</option>
  </select>
</select-enhancer>
```

## Custom Element Registration Order

It's important to remember that the Custom Elements for the `Combobox` component must always be registered in this order:

1. `ComboboxListbox` (and/or all child classes of the `ComboboxListbox`)
2. `ComboboxField` (and/or all child classes of the `ComboboxField`)
3. `ComboboxOption` (and/or all child classes of the `ComboboxOption`)
4. `SelectEnhancer` (and/or all child classes of the `SelectEnhancer`)

This order is required because some of the Custom Elements depend on each other.

## What's Next?

- Get a [high-level](.) view of how the `Combobox` component works. Or, dive deeper into the component's other segments:
  - [`<combobox-field>`](./combobox-field.md)
  - [`<combobox-listbox>`](./combobox-listbox.md)
  - [`<combobox-option>`](./combobox-option.md)
- Read our [guides](./guides) to learn more about what you can accomplish with our component.
