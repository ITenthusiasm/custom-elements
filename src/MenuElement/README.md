# The `MenuElement` Element

The `MenuElement` is a Custom Element which satisfies the accessibility requirements of an ARIA [`menu`](https://w3c.github.io/aria/#menu)[^1].

[^1]: Submenus are not supported at this time. Additionally, only regular [`menuitem`s](https://w3c.github.io/aria/#menuitem) are currently supported, not variants like `menuitemradio` or `menuitemcheckbox`. Please open a GitHub Issue if such support is needed.

## Install

```
npm install @itenthusiasm/custom-elements
```

## Quickstart

```html
<!-- HTML -->
<div>
  <button id="my-menubutton" type="button" aria-controls="my-menu" aria-expanded="false" aria-haspopup="menu">
    Menu
  </button>
  <menu-element id="my-menu" menubutton="my-menubutton">
    <div role="menuitem" data-action="cut">Cut</div>
    <div role="menuitem" data-action="copy">Copy</div>
    <div role="menuitem" data-action="paste">Paste</div>
    <hr />
    <div role="menuitem" data-action="save-as">Save As...</div>
    <div role="menuitem" data-action="print">Print</div>
  </menu-element>
</div>
```

```js
/* JavaScript */
import { MenuElement } from "@itenthusiasm/custom-elements";
// or import { MenuElement } from "@itenthusiasm/custom-elements/MenuElement";

customElements.define("menu-element", MenuElement);

// Listen for the action the user selects
const menuElement = document.querySelector("menu-element");
menuElement.addEventListener("menuselect", handleMenuSelect);

/**
 * @param {CustomEvent<string>} event
 * @returns {void}
 */
function handleMenuSelect(event) {
  const action = event.detail;
  if (action === "cut") {
    // Run Cut Logic
    return;
  }

  if (action === "copy") {
    // Run Copy Logic
    return;
  }

  // Etc. ...
}
```

## Usage Notes

The `MenuElement` works by wrapping any number of [`menuitem`s](https://w3c.github.io/aria/#menuitem) and (optional) [`separator`s](https://w3c.github.io/aria/#separator) (e.g., [`<hr>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/hr)), and providing the functionality needed to navigate/select the `menuitem`s in compliance with all accessibility requirements.

All that is needed for the `MenuElement` to work properly is an identifiable [`menubutton`](https://w3c.github.io/aria/#menuitem), as shown in the example above. A valid Menu Button must have:

1. An `id` (which the `MenuElement`'s `menubutton` attribute references)
2. An [`aria-controls`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-controls) attribute which references the `MenuElement`
3. A default [`[aria-expanded="false"]`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-expanded) state

The [`[aria-haspopup="menu"]`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-haspopup) attribute is not required but is highly recommended for accessibility purposes.

### Identifying `menuitem`s

An element is considered a `menuitem` if it has the `[role="menuitem"]` attribute and is a direct descendant of the `MenuElement`. This attribute (and child hierarchy) is required for all `menuitem`s.

Additionally, a `data-action` attribute is required on every `menuitem`. It serves as a unique identifier for the action which the user can take (e.g., `[data-action="copy"]`).

### Disabling `menuitem`s

To disable a `menuitem`, apply [`[aria-disabled="true"]`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-disabled) to the element.

### Hiding the `MenuElement`

The `MenuElement` yields styling/appearance decisions to the developer. To hide the `menu` while closed, you can apply the following CSS:

```css
menu-element:not([data-open]) {
  display: none;
}
```

To see a basic example of how to style the `MenuElement` and its items, see [`@itenthusiasm/custom-elements/MenuElement/MenuElement.css`](./MenuElement.css).

### Forcing `click`s to Occur on the Correct Elements

The `MenuElement` assumes that all clicks on `menubutton`s and `menuitem`s will occur directly on the `menubutton`s and `menuitem`s themselves, not on any of their children. This assumption is made to unlock extra performance enhancements for the component. However, it requires you to ensure that no [Pointer Events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events) can occur on the children of these elements. To enforce this, you can use the following CSS:

```css
button[aria-haspopup="menu"] *,
menu-element > [role="menuitem"] * {
  pointer-events: none;
}
```

<details>
  <summary>How Does This Work?</summary>

The CSS above guarantees that, for HTML like the following...

```html
<div>
  <button id="my-menubutton" type="button" aria-controls="my-menu" aria-expanded="false" aria-haspopup="menu">
    <span>Actions</span>
    <svg viewBox="0 0 100 100"><!-- Down Arrow Icon Markup --></svg>
  </button>

  <menu-element id="my-menu" menubutton="my-menubutton">
    <div role="menuitem" data-action="cut">
      <svg viewBox="0 0 100 100"><!-- Scissors Icon Markup --></svg>
      <span>Cut</span>
    </div>

    <div role="menuitem" data-action="copy">
      <svg viewBox="0 0 100 100"><!-- Copy Icon Markup --></svg>
      <span>Copy</span>
    </div>

    <!-- Other Menu Actions ... -->
  </menu-element>
</div>
```

... Pointer Events will _always_ occur on the owning `<button>` or `menuitem` and will never accidentally be triggered on inner children (like `<span>` or `<svg>`), which are not of interest to the `MenuElement`'s performance-tuned event listeners.

See MDN's documentation on the [`pointer-events` CSS property](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/pointer-events) for more details.

</details>

## Progressive Enhancement (Unsupported)

Unfortunately, _accessible_, _compliant_ ARIA `menu`s do not have an HTML-only equivalent which the `MenuElement` can fallback to. So at this time, `MenuElement` requires JavaScript to be enabled in the browser. Keep this in mind while building your applications.

## TypeScript Usage in JS Frameworks

Many JS frameworks, such as Svelte and React, often define their own "Element Namespaces". Because of this, most frameworks are not able (on their own) to recognize the correct attributes, properties, and event listeners that belong to the Custom Elements which you use. Thankfully, our library ships with TypeScript types that tell the various JS Frameworks about the existence and shape of our Custom Elements. To define _all_ of our library's Custom Elements within a Framework's "Element Namespace", simply import the appropriate type definition file:

```ts
import type {} from "@itenthusiasm/custom-elements/types/react";
// For Svelte: import type {} from "@itenthusiasm/custom-elements/types/svelte";
// For Vue: import type {} from "@itenthusiasm/custom-elements/types/vue";
// etc. ...
```

If you only intend to use _some_ of the Custom Elements provided by this library, then you should only import the types for those components.

```ts
// Define ONLY the `MenuElement` component's types in the framework's "Element Namespace"
import type {} from "@itenthusiasm/custom-elements/MenuElement/types/react";
// For Svelte: import type {} from "@itenthusiasm/custom-elements/MenuElement/types/svelte";
// For Vue: import type {} from "@itenthusiasm/custom-elements/MenuElement/types/vue";
// etc. ...
```

The component also ships with types that enhance the native DOM methods if you need them:

```ts
import type {} from "@itenthusiasm/custom-elements/types/dom";
// Or more specifically, import type {} from "@itenthusiasm/custom-elements/MenuElement/types/dom";

// This variable will be properly typed by TypeScript now, instead of just being a general `Element` type.
const menu = document.querySelector("menu-element");
```

## Restyling the Component

For simplicity, the `MenuElement` component ships with its own default styles via the `@itenthusiasm/custom-elements/MenuElement/MenuElement.css` file. You're welcome to use this file directly in your application if you like. However, if you intend to modify _any_ of the styles to fit your own needs, then we recommend creating your own CSS file for the component instead, using our styles as an initial template.

Remember to keep our [Usage Guidelines](#hiding-the-menuelement) in mind as you author your CSS.

## API

This section describes the attributes, properties, and events associated with the `MenuElement` Custom Element.

### Attributes

As a Custom Element, the `MenuElement` supports all of the [global attributes](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes). The attributes which are _specific_ to the `MenuElement` are as follows:

<dl>
  <dt id="attributes-menubutton">
    <a href="#attributes-menubutton"><code>menubutton</code></a>
  </dt>
  <dd>
    <p>
      Identifies the <a href="https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/"><code>menubutton</code></a> which toggles the <code>MenuElement</code> open/closed. Accepts the <code>id</code> of the controlling button.
    </p>
    <p>
      When this attribute is set, the <code>MenuElement</code> will automatically register all of the event listeners required for the button to expand/collapse the menu properly. If for any reason this attribute is changed later, the <code>MenuElement</code> will unregister the event listeners from the previous button and re-register them with the new button.
    </p>
    <blockquote>
      <p>
        NOTE: No event listeners will be registered if a valid <code>menubutton</code> cannot be found. This means a valid ID is required for the <code>MenuElement</code> to be operable.
      </p>
    </blockquote>
  </dd>

  <dt id="attributes-menuanchor">
    <a href="#attributes-menuanchor"><code>menuanchor</code></a>
  </dt>
  <dd>
    <p>
      Optionally identifies the element to which the <code>MenuElement</code> should be "anchored". Accepts the <code>id</code> of the desired "anchor" element.
    </p>
    <p>
      This attribute serves as an alternative to <a href="https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Anchor_positioning">CSS Anchor Positioning</a> for applications which must support older browsers. This <strong><em>is not</em></strong> a polyfill for CSS Anchor Positioning. Instead, it's a convenient, lightweight option for developers who need dynamically-placed <code>menu</code>s.
    </p>
    <p>
      It works by appending the <code>MenuElement</code> to the identified "anchor" element whenever the attribute changes (if the element exists). That way, the menu can be <a href="https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/position">positioned</a> with respect to the "anchor" by applying <code>position: relative</code> to the "anchor" and <code>position: absolute</code> to the menu. See our <a href="https://stackblitz.com/edit/custom-elements-menu-element">StackBlitz Demo</a> for more details.
    </p>
    <blockquote>
      <p>
        <strong>WARNING</strong>: This attribute is only intended to be used in applications using vanilla JavaScript. It is <strong>not</strong> intended to be used inside JavaScript frameworks like React, where the framework expects to have <em>exclusive</em> control over where elements are located in the DOM. (In frameworks which don't require strict DOM control, like Svelte, using <code>menuanchor</code> should be fine.)
      </p>
      <p>
        You <em>may</em> use <code>menuanchor</code> in JavaScript frameworks if you like, but you should do so with caution. A safer approach would be to use something like <a href="https://react.dev/reference/react-dom/createPortal"><code>createPortal</code></a> (in React) or <a href="https://vuejs.org/guide/built-ins/teleport"><code>&lt;Teleport&gt;</code></a> (in Vue).
      </p>
    </blockquote>
  </dd>

  <dt id="attributes-openwitharrows">
    <a href="#attributes-openwitharrows"><code>openwitharrows</code></a>
  </dt>
  <dd>
    <p>
      A boolean attribute indicating that the <code>ArrowUp</code> and <code>ArrowDown</code> keys may be used to open the <code>MenuElement</code>.
    </p>
    <blockquote>
      <p>
        Note: Users will still be able to open the menu by clicking it (e.g., with a Mouse or with <code>Enter</code>/<code>SpaceBar</code>) regardless of whether or not this attribute is set.
      </p>
    </blockquote>
  </dd>
</dl>

### Properties

As a Custom Element, the `MenuElement` inherits all of the methods and properties of the [`HTMLElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement) interface. The properties which are _specific_ to the `MenuElement` are as follows:

<dl>
  <dt id="properties-menuButtonElement">
    <a href="#properties-menuButtonElement"><code>menuButtonElement</code></a>
  </dt>
  <dd>
    <p>
      The <code><a href="https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement">HTMLElement</a></code> referenced by the <a href="#attributes-menubutton"><code>menubutton</code></a> attribute. Returns <code>null</code> if no element is found (e.g., if the attribute does not point to the <code>id</code> of a valid <code>HTMLElement</code>, or if the element is hidden behind a <a href="https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM">shadow boundary</a>).
    </p>
  </dd>

  <dt id="properties-menuAnchorElement">
    <a href="#properties-menuAnchorElement"><code>menuAnchorElement</code></a>
  </dt>
  <dd>
    <p>
      The <code><a href="https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement">HTMLElement</a></code> referenced by the <a href="#attributes-menuanchor"><code>menuanchor</code></a> attribute. Returns <code>null</code> if no element is found (e.g., if the attribute does not point to the <code>id</code> of a valid <code>HTMLElement</code>, or if the element is hidden behind a <a href="https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM">shadow boundary</a>).
    </p>
  </dd>

  <dt id="properties-openWithArrows">
    <a href="#properties-openWithArrows"><code>openWithArrows</code></a>
  </dt>
  <dd>
    <p>
      A <code>boolean</code> property which reflects the value of the <a href="#attributes-openwitharrows"><code>openwitharrows</code></a> attribute.
    </p>
  </dd>
</dl>

### Events

As a Custom Element, the `MenuElement` supports all of the events for the [`HTMLElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement), [`Element`](https://developer.mozilla.org/en-US/docs/Web/API/Element) and [`Node`](https://developer.mozilla.org/en-US/docs/Web/API/Node) interfaces. Additionally, it supports the events below. You can listen for them by using the [addEventListener()](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener) method.

<dl>
  <dt id="events-menuselect">
    <a href="#events-menuselect"><code>menuselect</code></a>
  </dt>
  <dd>
    <p>
      Fires when a user selects one of the items in the menu. This event will not be fired if the user attempts to select an item that is <a href="https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-disabled"><code>aria-disabled</code></a>.
    </p>
    <p>
      This is a <a href="https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent"><code>CustomEvent</code></a> whose <code>detail</code> property is a <code>string</code> representing the action the user selected. The value of this property matches the <code>data-action</code> attribute of the selected <code>menuitem</code>. Note that the <code>data-action</code> attribute is required for all of the items presented in the <code>MenuElement</code>.
    </p>
  </dd>
</dl>

## What's Next?

You've learned everything that you need to know about the `MenuElement` component. Now, it's time for you to try it out in one of your own applications! We've provided a [StackBlitz Demo](https://stackblitz.com/edit/custom-elements-menu-element) to help you get more familiar with the component as well if needed.
