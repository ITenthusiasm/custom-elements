# The `PseudoBackdrop` Element

> **WARNING: The `PseudoBackdrop` element <u>is not</u> considered by the maintainers to be a part of the Public API exposed by `@itenthusiasm/custom-elements` (hence its absence from the Documentation Home Page).**
>
> This is a component that was developed by the team for **_internal_** use cases. The component was put in this project/package out of _convenience_ for the team, and because it was theoretically possible that some developers outside the team _might_ find the component (or its architecture) useful or insightful, we found no harm in exposing it on the `@itenthusiasm/custom-elements` package.
>
> When we wrote this component, we had _very_ specific use cases in mind. We've tried to implement the component to handle use cases which are slightly broader than the original ones. But nonetheless, the component is still fairly rigid, and it _will_ break unless it is used exactly as required in this document.
>
> More insights on how/why the component was designed can be found at [_PseudoBackdrop: Architecture_](https://github.com/ITenthusiasm/custom-elements/tree/main/src/PseudoBackdrop/docs/extras/architecture.md) and [_PseudoBackdrop: Won't Fix_](https://github.com/ITenthusiasm/custom-elements/tree/main/src/PseudoBackdrop/docs/extras/wont-fix.md).

The `PseudoBackdrop` is a Custom Element which serves as a backdrop for elevated elements. You can think of it as an alternative to the [`::backdrop`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/::backdrop) pseudo-element, but with the ability to promote two elements to a higher layer rather than only one. It does this by applying a high [`z-index`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/z-index) to the elevated element(s) instead of placing them in the [Top Layer](https://developer.mozilla.org/en-US/docs/Glossary/Top_layer).

Note that this Custom Element is best used for one of two use cases:

1. You _need_ to support browsers before `dialog::backdrop` was supported (unlikely).
2. You need to elevate two elements above everything else on the page and put a styled backdrop underneath them.

If your use case does not fit into one of these two buckets, we recommend using the native `::backdrop` pseudo-element instead. (If your application requires use case #2, then we recommend reaching for `PseudoBackdrop` _only when it is needed_, and using `::backdrop` everywhere else in your application. This is what our team does on internal applications.)

## Install

```
npm install @itenthusiasm/custom-elements
```

## Quickstart

```html
<!-- HTML -->
<button id="button" type="button" popovertarget="actions">Actions</button>
<div id="actions" popover data-backdrop="backdrop" data-elevates="button">
  <button type="button">New Item</button>
  <button type="button">Edit Item</button>
</div>
<pseudo-backdrop id="backdrop" animates="none"></pseudo-backdrop>
```

```js
/* JavaScript */
import { PseudoBackdrop } from "@itenthusiasm/custom-elements";
// or import { PseudoBackdrop } from "@itenthusiasm/custom-elements/PseudoBackdrop";

customElements.define("pseudo-backdrop", PseudoBackdrop);
```

```css
/* CSS */
/* See Usage Notes for explanation */
pseudo-backdrop {
  visibility: hidden;
  position: fixed;
  inset: 0;
  z-index: 2147483646;
  background-color: rgb(0 0 0 / 50%);

  &[data-open] {
    visibility: visible;
  }
}

button[popovertarget] {
  position: relative;
}

:popover-open::backdrop {
  pointer-events: none; /* See Usage Notes and its accompanying Footnotes for explanation */
}
```

## Usage Notes (Advanced)

> NOTE: Remember that this is a component designed for internal purposes. If the component's design/usage seems rather specific and unusual, that is why.

The `PseudoBackdrop` works by interacting with "toggleable" elements which identify an instance of the component as their backdrop. Elements identify their "owning backdrop" by ID via the `data-backdrop` [data attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/How_to/Use_data_attributes). In the example above, the `[popover]` element indicates that the `pseudo-backdrop#backdrop` component is the one which will serve as its backdrop when toggled open.

An element is considered "toggleable" if it dispatches the [`toggle`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/toggle_event) event when it is revealed or hidden. By this definition, the [`<dialog>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog) element and all [`popover`s](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API) are considered "toggleable". Additionally, a [Disclosure Widget](https://adrianroselli.com/2020/05/disclosure-widgets.html) which [manually dispatches `toggle` events](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/dispatchEvent) on the element whose display is toggled (_not_ on the controlling `button`) are also considered "toggleable".

When a "toggleable" element which identifies a valid `PseudoBackdrop` is toggled open (as indicated by a dispatched [`ToggleEvent`](https://developer.mozilla.org/en-US/docs/Web/API/ToggleEvent)), the `PseudoBackdrop` promotes that element to a high [Stacking Context](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Positioned_layout/Stacking_context) by setting its `z-index` to `calc(infinity)` (the highest possible value). Similarly, when the `PseudoBackdrop` is closed, it demotes the elevated element by removing its `z-index` entirely. If the `PseudoBackdrop` is animated (e.g., such that it fades in and fades out), then this demotion will not occur until _after_ the _closing_ animation finishes.

> **NOTE**: The `z-index` CSS Property only applies to positioned elements (or to flex/grid items). Therefore, you must make sure that your promoted elements are positioned; otherwise `z-index: calc(infinity)` won't do anything. (This requirement also applies to [Elevated Siblings](#elevated-siblings).)

If an element identifies a `PseudoBackdrop` by ID but _does not_ dispatch any `toggle` events, it will be ignored. If an element dispatches `toggle` events but does not identify a valid `PseudoBackdrop` by ID, it is ignored.

### Styling Limitations

The `PseudoBackdrop` does not apply any styles to itself (though it does manipulate the `z-index` of _other_ elements). The reason for this is that different developers may want to style the backdrop differently when it is opened. (For example, some may want a dimmed backdrop, whereas others may want a blurred backdrop.) Since these solutions will already require their own styles, the component assumes that the one using the component will also provide the styling needed for it to serve as a suitable backdrop. **_Thus, you <u>must</u> apply the following styles to your `pseudo-backdrop`s for them to function properly_**:

```css
pseudo-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2147483646; /* analogous to `calc(infinity - 1)` */
}
```

[`position: fixed`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/position) and [`inset: 0`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/inset) enable the `pseudo-backdrop` to spread itself over the entire screen, and `z-index: 2147483646` (analogous to `calc(infinity - 1)`) places the backdrop under the element(s) promoted to `z-index: calc(infinity)` (as described at the beginning of the [_Usage Notes_](#usage-notes-advanced)).

Additionally, the `PseudoBackdrop` element does not hide or reveal itself. Instead, it expects to be provided with the styles necessary to hide it when closed and reveal it when open. To accomplish this, you can apply your "visible" styles when the `PseudoBackdrop` has the `data-open` attribute, and apply your "hidden" styles when this attribute is absent. Here's an example of how that could look in CSS:

```css
pseudo-backdrop {
  visibility: hidden;

  &[data-open] {
    visibility: visible;
  }
}
```

When combined with the styles mentioned earlier, we have the following styles which the `PseudoBackdrop` _requires at minimum_ to work properly:

```css
pseudo-backdrop {
  visibility: hidden;
  position: fixed;
  inset: 0;
  z-index: 2147483646;

  &[data-open] {
    visibility: visible;
  }
}
```

Note that these are only the minimum required styles if you _do not_ intend to animate the `PseudoBackdrop`, in which case you must also apply the [`[animates="none"]`](#attributes-animates) attribute to the component. If you _do_ intend to animate the `PseudoBackdrop`, then you do not need to set the `animates` attribute at all, but there are some restrictions regarding how you can animate the component:

If you want to animate the backdrop (e.g., with a fade in/fade out effect), then you _must_ use [CSS Transitions](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Transitions/Using). All other kinds of animations (e.g., [`@keyframes`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@keyframes) and the [Web Animation API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API)) are **forbidden** and will cause the `PseudoBackdrop` to behave erroneously if they are used on the component **at all**. The CSS below adds onto our earlier styles by animating the color of the backdrop when it opens/closes.

```css
pseudo-backdrop {
  visibility: hidden;
  position: fixed;
  inset: 0;
  z-index: 2147483646;

  opacity: 0;
  background-color: red;
  transition-property: visibility, opacity;
  transition-behavior: allow-discrete;
  transition-duration: 200ms;
  transition-timing-function: ease-in-out;

  &[data-open] {
    visibility: visible;
    opacity: 1;
  }
}
```

### Elevated Siblings

A "toggleable" element might want to elevate another element alongside itself. For example, consider a [Floating Action Button](https://m3.material.io/components/floating-action-button/overview) (FAB) which opens/closes a small list of Primary Actions that a user can perform in an application. When this button is opened, we want its list of Actions to be elevated by the `PseudoBackdrop`, but we might also want to elevate the FAB above the backdrop so that clicking it a second time closes/hides the actions. This can be accomplished by applying the `data-elevates` attribute to the "toggleable" element and pointing it at the FAB's ID. The [_Quickstart_](#quickstart) example, which bears similitude to the scenario we just described, demonstrates this.[^1]

[^1]: However, in the _Quickstart_ example, you must apply `pointer-events: none` to the Top-Layer-promoted `[popover]::backdrop` pseudo-element to ensure that it doesn't block clicks to the underlying FAB. (No matter how high an element's `z-index` is, it will always be rendered underneath an element in the Top Layer. That is why the `::backdrop`'s pointer events need to be removed.) If you don't like using `pointer-events: none`, then you can use something else like `display: none` instead.

When a "toggleable" element which identifies a valid `PseudoBackdrop` (via `data-backdrop`) _and_ a valid "elevated sibling" (via `data-elevates`) is toggled open, _both_ the "toggleable" element and the "elevated sibling" will be promoted by the `PseudoBackdrop`. Similarly, the `PseudoBackdrop` will demote both elements when the "toggleable" element is finally closed. If no valid `data-elevates` attribute is discovered by the `PseudoBackdrop`, then only the "toggleable" element will have its `z-index` promoted/demoted.

This is the main reason to use `PseudoBackdrop`. Again, if you don't need to satisfy this use case, then `::backdrop` is likely a better fit.

### Closing the "toggleable" Element on Backdrop `click`

The `PseudoBackdrop` _does not_ attempt to close the "toggleable" element referencing it when clicked, as this behavior is not desired in all circumstances. If you want this behavior, you must add the necessary `click` event listener(s) yourself.

## API

This section describes the attributes, properties, and events associated with the `PseudoBackdrop` Custom Element.

### Attributes

As a Custom Element, the `PseudoBackdrop` supports all of the [global attributes](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes). The attributes which are _specific_ to the `PseudoBackdrop` are as follows:

<dl>
  <dt id="attributes-animates">
    <a href="#attributes-animates"><code>animates</code></a>
  </dt>
  <dd>
    <p>
      Used to tell the <code>PseudoBackdrop</code> how you intend to animate it when it is opened or closed. This is necessary to ensure that all <code>z-index</code>es are applied/removed at the proper time, and that no memory leaks are accidentally introduced into the application.
    </p>
    <blockquote>
      <p>
        <strong>NOTE</strong>: This attribute <strong><em>does not</em></strong> determine whether or not the <code>PseudoBackdrop</code> performs any animations; your CSS is what determines that. Rather, this attribute tells the <code>PseudoBackdrop</code> whether or not <em>you</em> intend to animate it. For example: If you tell the <code>PseudoBackdrop</code> that it <em>won't</em> be animated, then it will apply/remove <code>z-index</code>es immediately when a "toggleable" element is opened/closed; but if you tell the component that you <em>will</em> animate it, then it will intelligently apply/remove <code>z-index</code>es based on when your CSS Transitions start/end.
      </p>
    </blockquote>
    <blockquote>
      <p>
        <strong>NOTE</strong>: If you are using media queries like <code>@media (prefers-reduced-motion)</code> to disable animations for the <code>PseudoBackdrop</code>, you must ensure that the component's <code>animates</code> attribute also takes this into account.
      </p>
      <p>
        One way to handle this would be to add an event listener to a <a href="https://developer.mozilla.org/en-US/docs/Web/API/MediaQueryList"><code>MediaQueryList</code></a> in JavaScript.
      </p>
    </blockquote>
    <p>Allowed Values:</p>
    <dl>
      <dt><code>both</code> (Default)</dt>
      <dd>
        <p>
          You <strong>promise</strong> that you will animate the <code>PseudoBackdrop</code> (with CSS Transitions) whenever it opens or closes.
        </p>
        <blockquote>
          <p>
            <strong>WARNING</strong>: Since <code>both</code> is the <em>default</em> configuration, <strong><em>the <code>PseudoBackdrop</code> component expects to be animated by default</em></strong>. If you don't intend to animate the backdrop, then you <strong><em>must</em></strong> set <code>[animates="none"]</code>.
          </p>
        </blockquote>
      </dd>
      <dt><code>forwards</code></dt>
      <dd>
        <p>
          You <strong>promise</strong> that you will <strong>only</strong> animate the <code>PseudoBackdrop</code> (with CSS Transitions) whenever it opens.
        </p>
      </dd>
      <dt><code>backwards</code></dt>
      <dd>
        <p>
          You <strong>promise</strong> that you will <strong>only</strong> animate the <code>PseudoBackdrop</code> (with CSS Transitions) whenever it closes.
        </p>
      </dd>
      <dt><code>none</code></dt>
      <dd>
        <p>
          You <strong>promise</strong> that you <strong>will not</strong> animate the <code>PseudoBackdrop</code> <strong>at all</strong>.
        </p>
      </dd>
    </dl>
  </dd>
</dl>

### Properties

As a Custom Element, the `PseudoBackdrop` inherits all of the methods and properties of the [`HTMLElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement) interface. The properties which are _specific_ to the `PseudoBackdrop` are as follows:

<dl>
  <dt id="properties-animates">
    <a href="#properties-animates"><code>animates</code></a>
  </dt>
  <dd>
    <p>
      Reflects the <a href="#attributes-animates"><code>animates</code></a> attribute. Type is <code>"both" | "forwards" | "backwards" | "none"</code>.
    </p>
  </dd>
</dl>

## Gotchas

We will repeat ourselves again and again: _This is an <u>internal</u> component designed for <u>very specific</u> use cases_. We will always keep this documentation up-to-date, but you should only expect this component to be easy to work with if you use it _strictly_ as prescribed in this documentation.

A component this rigid is certain to have some gotchas/limitations/pitfalls. We describe them in this section.

### 1&rpar; Opening Multiple Backdrops Simultaneously May Produce Unexpected Behavior

`PseudoBackdrop`s are not aware of each other like `popovers` are. In other words, if Backdrop A is already open, it will not automatically close itself if Backdrop B is newly toggled open.[^2] This means it's possible to have multiple backdrops open at the same time. Although it's possible, this behavior is not recommended, just like it isn't recommended to stack `<dialog>`s on top of each other.

[^2]: That said, you can technically rely on `popover`s to force `PseudoBackdrop`s to "auto-close" each other. If Popover A references Backdrop A and Popover B references Backdrop B, and if Popover A is already open, then when Popover B is opened, the browser will automatically close Popover A before opening Popover B. This, in turn, means that the browser will automatically trigger Backdrop A to close before Backdrop B is opened.

Not only is this approach discouraged because it can result in poor user experiences (like stacking modal `<dialog>`s often does), but it is also discouraged because it may yield unexpected behaviors. Remember that `PseudoBackdrop` promotes elements to a higher Stacking Context by applying `z-index: calc(infinity)` to whatever it elevates. But what happens when multiple `z-index: calc(infinity)`s are placed in the DOM? Well, the element with the latest insertion order is placed in the highest location.

This sounds simple enough to control, but in a large/complex codebase, tracking insertion order can become unwieldy quickly. It's much simpler to open/close one `PseudoBackdrop` at a time than it is try to manage multiple open ones based on insertion order.

**_TL;DR: Avoid having multiple `PseudoBackdrop`s open at the same time._** It's a bad UX. And from a developer perspective, it's only doable reliably if you meticulously manage your DOM Node insertion order (which will be difficult and likely unprofitable to do). **_Instead, always close the currently-open `PseudoBackdrop` before opening a new one._**

### 2&rpar; Only One Element Should Try to Open a Given PseudoBackdrop at a Time

It's possible for multiple elements to reference the same `<pseudo-backdrop>`.

```html
<div data-backdrop="backdrop">First</div>
<div data-backdrop="backdrop">Second</div>
<pseudo-backdrop id="backdrop"></pseudo-backdrop>
```

This is perfectly fine. However, **_only one element should try to open the same backdrop at a time._** The succinct reason for this is that, in the above example, if `First` is already toggled open, and `Second` is newly toggled open before `First` is closed, then the `PseudoBackdrop` will lose track of `First` entirely.[^3] That means it will only know how to demote `Second` when `Second` is toggled closed, but it won't know how to demote `First`. This can very easily result in a bad UX if `First` is ever put in a position where it's unexpectedly placed over something it shouldn't be (like a `combobox`'s `listbox`).

[^3]: Technically, you can circumvent this issue if the browser automatically closes `First` when `Second` is opened, as mentioned in Footnote #2.

**_TL;DR: When multiple elements point to the same `PseudoBackdrop`, <u>do not</u> open more than 1 element at a time. Instead, always make sure that Toggleable Element A is toggled closed <u>before</u> Toggleable Element B is toggled open._**

### 3&rpar; "Toggleable" Elements Must Be Closed before their `PseudoBackdrop`s are Disconnected from the DOM

The `PseudoBackdrop` will automatically attempt to close itself (_not_ the "toggleable" element that references it) and remove any `z-index` configurations that it applied to other elements when removed from the DOM. But this is a last-ditch cleanup effort that can become unreliable in edge cases.

**_To avoid unreliable edge cases, always ensure that a `PseudoBackdrop` (and the "toggleable" element referencing it) is closed before removing it from the DOM (or relocating it in the DOM)._** If this is not doable, then you should at least ensure that all elements are removed from the DOM at the same time. Never remove the `PseudoBackdrop` without the "toggleable" element, or the "toggleable" element without the `PseudoBackdrop`.

> Are you starting to see a pattern here? Basically, whenever you want to do something fancy with a `PseudoBackdrop` &mdash; relocating it, removing it, opening another one, etc. &mdash; **_always_** close the already-open `PseudoBackdrop` first (by closing the open "toggleable" element referencing it).
>
> That said, you _may_ remove all elements from the DOM simultaneously if needed. This should be a safe operation as long as the "toggleable" element is toggled closed when removed from the DOM. (This happens automatically for `<dialog>`s and `popover`s.)

### 4&rpar; Only CSS Transitions Can Be Used to Animate the `PseudoBackdrop`

This was already stated earlier, but we wanted to reiterate it: **_Only CSS Transitions should be used to animate this element._** Other animation techniques like `@keyframes` and the Web Animations API _should not_ be used to animate this element under _any_ circumstances. Otherwise, you may provide a jank opening/closing animation for your users, and in edge cases you may even cause memory leaks.

## What's Next

Honestly, it's impressive that you made it this far through the internal documentation. We don't have anything else for you here, and we intentionally do not have a StackBlitz demo for this internal component.

Best of luck in using the component in your own application! Despite its kinks, we've found it helpful. We hope the same will be true for you!
