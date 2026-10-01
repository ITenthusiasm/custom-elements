# The `PseudoBackdrop` Custom Element's Architecture

This file documents the architecture of the `PseudoBackdrop` Custom Element, including the key design decisions that were made, the important assumptions upon which the design decisions stand, and the reasoning behind some of our nomenclature.

## Prologue: Why `PseudoBackdrop` for the Name?

Today [`::backdrop`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/::backdrop) is a valid pseudo-element, so it felt wrong to call the component something like `<backdrop-element>`. **_Real_** `::backdrop`s are rendered in the [`Top Layer`](https://developer.mozilla.org/en-US/docs/Glossary/Top_layer) alongside their owning element (e.g., a `<dialog>` or a `popover`). But our Web Component isn't inherently rendered in the Top Layer; it merely sets `z-index`es on itself and on other elements to _emulate_ a Top Layer experience. Thus, our component is a backdrop in some sense, but in another sense it is not a real backdrop when compared with the modern web's `::backdrop` solution. Hence the name: `PseudoBackdrop`.

## Additional Terminology

In this document, we refer to "elevatable" and "toggleable" elements. These are considered to be one and the same.

When a browser-native `popover` element is opened by a `<button>`, it dispatches a `toggle` event and is placed in the Top Layer. In other words, it is toggled and elevated at the same time. Consequently, _for the purpose of this document's discussion_, we consider "elevatable elements" and "toggleable elements" to be the same thing.

`popover`s are not the only elements whose displays can be toggled on/off and whose positions can be shifted to a higher/lower layer. `<dialog>`s also fit this description, as do elements which are promoted/demoted to different layers with the `z-index` CSS Property. (The `z-index` property is incapable of placing elements in the Top Layer, however.)

So, an "elevatable element" can be _toggled_ to become visible (or invisible) and be _elevated_ (or dropped) to a higher (or lower) layer. An "elevatable" element _identifies_ the `PseudoBackdrop` with which it is associated, and _instructs_ the `PseudoBackdrop` when to promote (or demote) itself and (optionally) another element with a sufficiently-high `z-index`. This concept will make more sense as you read about the `PseudoBackdrop`'s architecture.

## The Problem

Typically, when a user opens an entity such as a `menu`, `dialog` or `popover`, developers want the entity to appear _above_ everything else so that the user can focus on it. To help with this focus, developers often place a backdrop underneath the elevated entity and above the rest of the page's content. This backdrop helps users focus on the elevated entity by accomplishing _at least_ one of the following:

- **Blocking clicks to everything underneath the elevated entity.** This protects users from accidentally interacting with something that _isn't_ related to the elevated entity.
- **Obscuring the content underneath the elevated entity.** By styling the backdrop to be a dimmed background (e.g., `background-color: rgb(0 0 0 / 50%)`) or a blurred backdrop (e.g., with a [`backdrop-filter`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/backdrop-filter)), developers can pull the user's attention _away_ from the rest of the page and _towards_ the elevated entity (which has no obscuring styles).

Developers _might_ have the elevated entity close/descend if the backdrop is clicked. But this behavior is optional. And even in cases where this behavior is implemented, the backdrop is still accomplishing its purpose of preventing accidental interactions with unrelated content.

Now, if these were the only problems that backdrops had to solve, then the `::backdrop` pseudo-element would be sufficient. **_However_**, there are use cases where a developer may want to elevate _multiple_ entities simultaneously. For example, when a user opens a `contextmenu` for a card in a list, a developer may want to elevate _both_ the card's menu _and_ the card itself. This mimics the native `contextmenu` behavior seen on `iOS` devices.

The `::backdrop` element is always rendered alongside its owning `<dialog>` or `popover`, which itself is always rendered _in the Top Layer_ (at least as of 2026-09-11). In the card example, this means that a dimmed `::backdrop` would always appear underneath the card's menu but _above_ the card itself (since the card is not promoted to the Top Layer). Therefore, the multi-element elevation experience described above is impossible to replicate with `::backdrop`s. If such an experience is desired, a solution involving regular elements with regular [`z-index`es](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/z-index) is needed instead.

## The Solution's Approach

**When an Element Is Elevated**:

1. Set the `z-index` of the elevated element (e.g., a card's `contextmenu`) so that it appears _above_ everything else.
2. Optionally, _apply the same `z-index`_ to another element on the page (e.g., the card which owns the `contextmenu`).
3. Render the `<pseudo-backdrop>` with a `z-index` that places it _below_ the elevated entities and _above_ everything else.
   - Optionally, animate the backdrop _in_ as well (e.g., with fading or blurring).

**When an Element Descends**:

1. Animate the `<pseudo-backdrop>` _out_ (if it was animated in).
2. Hide the backdrop.
3. Remove the `z-index`es applied to all elevated elements.

It is imperative that these actions are taken **_in order_** as seen above to avoid jank user experiences. Particularly, it is important for the `z-index`es of the elevated elements not to be changed too early/late with respect to any backdrop animations.

### Objectively Defining/Identifying Elevation and Descent

[According to MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/toggle_event), a `toggle` event is dispatched when a `popover`, `<dialog>` or `<details>` element is toggled open or closed. And since a `popover`/`<dialog>` is immediately placed in the `Top Layer` when opened (and immediately removed from the `Top Layer` when closed), we can say that **_the `toggle` event is a valid indicator of when an element is elevating or descending_**. Of course, that only holds true for `popover`s and `<dialog>`s. But as of today, those are the only two kinds of elements that can be promoted to the Top Layer anyway. So the statement still holds.

Elements which _aren't_ `popover`s or `<dialog>`s, yet which emulate a "Top Layer" experience through `z-index`es, must also have an opening/closing mechanism. Additionally, if they want to integrate with the `PseudoBackdrop`, they must _communicate_ with the `PseudoBackdrop` when this mechanism is triggered. Given the intersection of these two constraints, we've concluded that it makes sense for the `PseudoBackdrop` to require **_all_** elements which "request elevation + a backdrop" to do so via `ToggleEvent`s that match the browser's native behavior. This constraint is considered reasonable because it enables interop with native `<dialog>`/`popover` elements (in cases where `::backdrop` isn't sufficient), but also allows interop with more generic [Disclosure Widgets](https://adrianroselli.com/2020/05/disclosure-widgets.html) and/or [`<details>` hacks](https://github.com/whatwg/html/issues/10357).

Note that since _any_ element on a page could potentially be toggled to open a `PseudoBackdrop`, the component will need to listen for `toggle` events at the `Document` (or `ShadowRoot`) level. And since the `toggle` event doesn't bubble, the component will need to rely on event capturing rather than event bubbling.

TL;DR:

- `toggle` events indicate when an element is elevating or descending.
- Any "openable" element which does not _natively_ dispatch a `ToggleEvent` must do so manually via [`EventTarget.dispatchEvent()`](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/dispatchEvent) so that it can communicate with the `PseudoBackdrop`.
- `toggle` events will need to be listened for at the `Document | ShadowRoot` level _in the `capture` phase_.

#### Determining Who Should Dispatch `toggle` Events

For `<dialog>`s and `popover`s opened by `<button>`s via [`popovertarget`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/button#popovertarget) and [`command`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/button#command)/[`commandfor`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/button#commandfor), `ToggleEvent`s are **_always_** dispatched on the _opened_ element, **_not_** on the controlling `<button>` element. Thus, for consistency's sake, we should enforce the same rule for other elements which want to communicate with the `PseudoBackdrop`: The _opened_ element (e.g., a card's `contextmenu`) should dispatch the `ToggleEvent`.

Admittedly, this might be slightly less convenient for those who want to use the [`<details>` hack](https://github.com/whatwg/html/issues/10357). But the simple solution to that problem is to avoid using a hack at all and to instead use a valid Disclosure Widget. Nonetheless, the `<details>` hack can still be used as long as the `<details>` element itself is not _identified_ as an elevatable element (see next section).

TL;DR:

- The element being opened/elevated dispatches the `toggle` event.
- The `<button>` (or whichever other element) which toggled the elevatable element's display _does not_ dispatch the `toggle` event.
  - Even if it does dispatch this event (as in the case of the `<details>` element), the event will be ignored.

### Identifying an Elevatable Element

There's a reason that, [up until recently](https://developer.mozilla.org/en-US/docs/Web/API/Element/ariaControlsElements), various ARIA attributes like [`aria-controls`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-controls) have relied on element `id`s to function properly: Element IDs are one of the easiest and most performant ways to identify/locate other elements in the DOM. Newer solutions like [`ariaControlsElements`](https://developer.mozilla.org/en-US/docs/Web/API/Element/ariaControlsElements) are an alternative to relying on an ID, but they still require you to have a reference to another `HTMLElement`. Without that reference, `id`s are still a developer's best bet at accessing another element.

For this reason, for better or for worse, we decided that the `PseudoBackdrop` will rely on IDs to identify the elements on which it operates. Specifically, a toggleable element whose `data-backdrop` attribute points to a valid `<pseudo-backdrop>` by ID will be elevated by said backdrop to a sufficiently high `z-index` when toggled open. If an element dispatches a `toggle` event but does not point to a valid `PseudoBackdrop` through this attribute, then the event will be ignored, and no elevation/descent will occur.

An elevatable element _may_ want to elevate another element alongside itself (as in the case of the card example mentioned earlier). Since that other element is not guaranteed to be the button which opened the elevated element, the only surefire way to identify the other element is by ID. Thus, an elevatable element _may_ set a `data-elevates` attribute which points to the (singular) element that it wants the `PseudoBackdrop` to elevate alongside itself.

TL;DR:

- An element which points to a `PseudoBackdrop` by ID via the `data-backdrop` attribute, and which dispatches `toggle` events, is a valid elevatable element.
- An elevatable element _may_ tell the `PseudoBackdrop` to simultaneously elevate an _additional_ element alongside itself by pointing to that element by ID via the `data-elevates` attribute.

### Backdrop Animations

Remember that the `PseudoBackdrop` component needs to be able to determine _how_ it's being animated so that it can increase/decrease the `z-index`es of its target elements [at the right time](#the-solutions-approach). We decided that the component would observe [CSS Transitions](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Transitions) to determine how/when it's being animated, and that we would require developers to leverage CSS Transitions (rather than [`@keyframes`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@keyframes) or the [Web Animations API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API)) if they wanted to animate the backdrop correctly and reliably.

We made this decision for a few reasons:

1. Although the [Web Animations API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API) is nice, it requires JavaScript, which is problematic if people want more flexibility in how they style/animate the backdrop when it opens/closes. This means our best bet is a CSS-based solution.
2. Trying to reconcile `Promise`s from the Web Animations API so that we can time `z-index` updates correctly can become unreliable.
3. Transitions seem easier to work with in this case than [`@keyframes`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@keyframes).

> NOTE: Technically speaking, developers could still rely on `@keyframes` or the Web Animations API if they wanted. The backdrop would animate fine, but it would produce janky experiences because the timing of _when_ the `z-index`es are updated for the target elements would be off.

Since we're relying on CSS Transitions for backdrop animations, we need to give consumers a way to know _when_ a `PseudoBackdrop` is open or closed. We'll communicate this via a `data-open` attribute, meaning that consumers can rely on `pseudo-backdrop` and `pseudo-backdrop[data-open]` CSS selectors for styling.

TL;DR:

- The `PseudoBackdrop` expects to be animated _exclusively_ with CSS Transitions.
- The `pseudo-backdrop[data-open]` selector/attribute can be used in the CSS to determine when a backdrop is open or closed.

### Important Guarantees with CSS Transitions

If you look at the [`CSS Transitions Module Level 1`](https://www.w3.org/TR/css-transitions-1) Specification, as well as MDN's documentation for the [`transitionrun`](https://developer.mozilla.org/en-US/docs/Web/API/Element/transitionrun_event), [`transitionstart`](https://developer.mozilla.org/en-US/docs/Web/API/Element/transitionstart_event), [`transitionend`](https://developer.mozilla.org/en-US/docs/Web/API/Element/transitionend_event), and [`transitioncancel`](https://developer.mozilla.org/en-US/docs/Web/API/Element/transitioncancel_event) events, you will find important information regarding how CSS Transitions behave. (If you are curious, you can also take a look at [`CSS Transitions Module Level 2`](https://www.w3.org/TR/css-transitions-2/).)

Here are MDN's introductory definitions for the Transition Events:

<dl>
  <dt><code>transitionrun</code></dt>
  <dd>
    <p>
      The <code>transitionrun</code> event is fired when a CSS transition is first created, i.e., <em>before</em> any <code>transition-delay</code> has begun.
    </p>
  </dd>

  <dt><code>transitionstart</code></dt>
  <dd>
    <p>
      The <code>transitionstart</code> event is fired when a CSS transition has actually started, i.e., after any <code>transition-delay</code> has ended.
    </p>
  </dd>

  <dt><code>transitionend</code></dt>
  <dd>
    <p>
      The <code>transitionend</code> event is fired when a CSS transition has completed. In the case where a transition is removed before completion, such as if the <code>transition-property</code> is removed or display is set to none, the event will not be generated.
    </p>
    <p>
      The <code>transitionend</code> event is fired in both directions - as it finishes transitioning to the transitioned state, and when it fully reverts to the default or non-transitioned state. If there is no transition delay or duration, if both are 0s or neither is declared, there is no transition, and none of the transition events are fired. If the <code>transitioncancel</code> event is fired, the <code>transitionend</code> event will not fire.
    </p>
  </dd>

  <dt><code>transitioncancel</code></dt>
  <dd>
    <p>
      The transitioncancel event is fired when a CSS transition is canceled.
    </p>
  </dd>
</dl>

None of these events are cancelable.

In case it helps, here are two examples of when `transitioncancel` can occur: 1&rpar; It can occur if a CSS Transition is reversed before it completes; 2&rpar; It can occur if an element is removed from the DOM before its transition finishes. The event will not be fired if `transitionend` fires.

Here are some pieces of information related to CSS Transitions that are critical to understand, and which motivated us to rely solely on CSS Transitions for backdrop animations (due to their reliability/predictability).

**_What's most important about these transition events is that their order is always guaranteed (per animated CSS Property)_**:

`transitionrun` &rarr; `transitionstart` &rarr; `transitionend` | `transitioncancel`

> Note: `transitionstart` won't be fired if a transition _with a delay_ is canceled before the delay ends. But, `transitionrun` is always guaranteed.

**_In fact, the order is guaranteed even if a transition is reversed midway:_**

`transitionrun` &rarr; `transitionstart` &rarr; `transitioncancel` (reversal) &rarr; `transitionrun` &rarr; `transitionstart` &rarr; `transitionend` | `transitioncancel`

> Note: We put `transitionend` | `transitioncancel` at the end because it's theoretically possible that an element is removed from the DOM or hidden before its transition completes.

**_And browsers are GUARANTEED to dispatch EITHER `transitionend` OR `transitioncancel` after a CSS Transition has started (`transitionrun`), even if a transition is interrupted by DOM Node Removal._**

You can see this more clearly by viewing [_Section 3: Starting of Transitions_](https://www.w3.org/TR/css-transitions-1/#starting) in the CSS Transitions Module Level 1 Specification. Browsers are required to track _all_ transitions that occur on an element, including their starting and ending times. And yes, they are required to _cancel_ transitions for any elements that are removed from the DOM mid-transition. See this quotation from the spec:

> If an element is no longer in the document, implementations must [cancel](https://www.w3.org/TR/css-transitions-1/#transition-cancel) any [running transitions](https://www.w3.org/TR/css-transitions-1/#running-transition) on it and remove transitions on it from the [completed transitions](https://www.w3.org/TR/css-transitions-1/#completed-transition).

The three facts above give us some very important guarantees:

#### 1&rpar; `z-index`es Can Always Be Applied in the Right Order

If the order of transition events is always guaranteed even when Transition Reversal or DOM Removal happens, then **_as long as all transition event handlers are ENTIRELY synchronous in their implementations, they will ALWAYS be run in the correct order._**

So imagine a `<pseudo-backdrop>` has a `2000ms` animation. The user opens the backdrop, closes it before the animation completes (resulting in transition reversal), and re-opens it again before the closing animation completes (resulting in yet another transition reversal). Assuming the high `z-index` is always applied on `transitionrun` (when the backdrop is opened and the first `transition-property` starts animating) and always removed on `transitionend` | `transitioncancel` (when the backdrop is closed and all `transition-property` animations have subsided), the elevated element will _always_ have the correct `z-index` at _any_ given point in time _as long as all event handlers are synchronous and are [executed at the proper time](#1-transition-event-handlers-should-only-execute-when-appropriate)_.

Again, synchronicity is key here. We **_cannot_** use `Promise`s or `setTimeout`s **_at all_**, because doing so introduces unpredictable behavior in the Event Loop which could potentially allow `z-index`es to be updated in an incorrect order.

#### 2&rpar; Memory Safety Can Be Ensured

Whenever an element _tries_ to transition, `transitionrun` _will_ run. Thus,

```js
// Opening the Backdrop
backdrop.addEventListener("transitionrun", handleTransitionrun, { once: true });
backdrop.toggleAttribute("data-open", true);
```

is always memory safe.

With that setup, I don't think it's possible for the element to be removed from the DOM before `transitionrun` fires. But even if that was possible, it would be an edge case which we don't intend to solve for unless it becomes an _actually possible, actually observable_ bug for users that occurs because of _our_ code rather than a browser implementation failure. But I don't anticipate any problems. (Besides, the event listener would be garbage collected when the backdrop is garbage collected anyway.)

In the same vein, the following should also be memory safe:

```js
// Closing the Backdrop
backdrop.addEventListener("transitionend", handleTransitionCompletion);
backdrop.addEventListener("transitioncancel", handleTransitionCompletion);
backdrop.toggleAttribute("data-open", false);
```

However, memory safety will only be guaranteed if **_all_** of the following are true:

1. `handleTransitionCompletion()` always calls `removeEventListener` for _both_ `transitionend` _and_ `transitioncancel` (after _all_ animations have completed).
2. The transition event listeners are registered _on the target element_ (i.e., the `PseudoBackdrop`) rather than on the document.
   - When an element is removed from the DOM, `transitioncancel` can fire directly on the removed element, but it won't be fired on the document and therefore cannot be observed with `document.addEventListener()` even if the `{ capture: true }` option is set.

As we mentioned earlier, we don't anticipate any scenarios where `transitionrun` will fail to be dispatched after calling `backdrop.toggleAttribute()` synchronously. And if `transitionrun` is guaranteed to be dispatched, then _either_ `transitionend` _or_ `transitioncancel` is **_guaranteed_** to be dispatched as well, even if the element is removed from the DOM. Therefore, memory safety is always guaranteed for `handleTransitionCompletion()`.

Also note that according to MDN, [a regular function cannot be double-registered with `addEventListener()`](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener). So you don't need to worry about double-registration happening on an element as long as you are using regular functions and not arrow functions. (Though again, we don't anticipate double registration ever being a real problem because we don't expect the `transitionrun` &rarr; `transitionend` | `transitioncancel` event handler cycle to ever be erroneous.)

Of course, it's arguable that the transition event listeners should be applied on `connectedCallback()` (and removed on `disconnectedCallback()`) rather than being dynamically added/removed as needed. If you can find a way to do that while keeping `z-index` correct at all times and without threatening application memory usage to any meaningful extent, then you're welcome to try it if you like.

Whatever approach you take, _bear in mind that **transition events are dispatched on an element for <u>every</u> CSS Property that is animated**_. This impacts when demoting the backdrop and its associated elements is safe. (For example, if one backdrop transition is `100ms` and another is `200ms`, you need to wait until _both_ transitions finish before letting the `transitionend` | `transitioncancel` event handler execute.) It also impacts how you should think about `transitionrun`: That event's handler _should not_ attempt redundant promotion.

---

Note: We intentionally _do not_ take into account any scenarios where a user closes out the application (e.g., by closing their tab). In such cases, all memory is reclaimed anyway (if the user's browser is working correctly), so there's no point in worrying about cases where the application is killed. We're only noting this because an annoying LLM bothered raising application closure as a concern even though it was completely irrelevant.

### Gotchas and Limitations

The following items are notes and design decisions that we aren't too excited about, but which are important for ensuring the component behaves in a reasonable and predictable manner.

#### 1&rpar; Transition Event Handlers Should Only Execute When Appropriate

If we're going to rely on CSS Transition Event Handlers, then we need to make sure they don't execute incorrectly.

In Google Chrome we observed that if a user toggles a button which triggers a CSS Transition at inhuman speeds (e.g., by holding `Enter` on the `<button>`), it's possible for `transitionrun` to fire with a `CSSTransition` whose [`playState`](https://developer.mozilla.org/en-US/docs/Web/API/Animation/playState) is already `finished`.

> Note: A [`CSSTransition`](https://developer.mozilla.org/en-US/docs/Web/API/CSSTransition) is a child class of [`Animation`](https://developer.mozilla.org/en-US/docs/Web/API/Animation)

If this happens, it would be an indication that a user opened and then instantaneously closed the `PseudoBackdrop`. (Or that they closed it and then instantaneously reopened it.) In these cases, our handlers shouldn't do anything at all.

Checking the length of the array returned by the synchronous [`element.getAnimations()`](https://developer.mozilla.org/en-US/docs/Web/API/Element/getAnimations) function should enough for us here. If `transitionrun` fires but there are no pending animations, then we **_should not_** apply the high `z-index` to the element.

We also observed that `element.getAnimations()` may return a non-empty array during `transitioncancel` if the cancellation resulted from a transition reversal. In this case, the `transitioncancel` event handler should do nothing because a future `transitionrun` &rarr; `transitionend` | `transitioncancel` cycle will put `z-index` in its proper state. That scenario aside, `element.getAnimations()` is expected to return an _empty_ array during `transitionend`/`transitioncancel` when all animations have subsided.

Note that in the case where a `transitionrun` &rarr; `transitioncancel` &rarr; `...` &rarr; `transitionend` | `transitioncancel` reversal cycle causes the backdrop to animate from `open` &rarr; `closed` &rarr; `...` &rarr; `open`, the ending `transitionend` | `transitioncancel` event listener **_must not_** execute any element demotion logic because the element will still be open.

Regarding the scenario where `transitionrun` executes with a finished animation, you will also see `transitionstart` and `transitionend` immediately fire as well. All 3 events will fire (in order) on the element, and `element.getAnimations()` will return an empty array during each of the 3 events. In this case, it is acceptable for the `handleTransitionCompletion()` function called on `PseudoBackdrop`-closure to attempt to remove `z-index`es. This will be an unnecessary operation (since no `z-index`es would have been applied), but it will be harmless because it won't put the element in an invalid state.

One final note: If the `handleTransitionCompletion()` function is called when the `PseudoBackdrop` is removed from the DOM, it can skip `z-index` removal if the `disconnectedCallback()` takes care of it.

TL;DR:

- When a `PseudoBackdrop` opens, the `transitionrun` event handler should only run if `element.getAnimations()` returns a non-empty array (indicating that the backdrop really is animating itself open).
- When a `PseudoBackdrop` closes, the `transitionend`/`transitioncancel` event handler should only run if `element.getAnimations()` returns an _empty_ array (indicating that _all_ closing transitions have truly subsided) **<u>and</u>** the backdrop is closed.
- If the `handleTransitionCompletion()` function is called when the `PseudoBackdrop` is removed from the DOM, it can skip `z-index` removal if the `disconnectedCallback()` takes care of it.

#### 2&rpar; We Must Account for Rapid User Interactions

While open, the `PseudoBackdrop` blocks all invalid Mouse Activity from the rest of the page, but it doesn't provide Focus Trapping (which wouldn't necessarily be desired in all scenarios anyway). Thus, it's theoretically possible for a user to do the following:

1. Open `popover` A.
2. Close `popover` A with Keyboard.
3. Immediately open `popover` B with Keyboard (before the `PseudoBackdrop` finishes animating out for `popover` A).

This is even more realistic if the `PseudoBackdrop`'s transition duration is too large.

In this case, the `PseudoBackdrop` needs to demote the old elevated element(s) _immediately_ and then elevate the new element(s). But the backdrop itself can keep animating as normal. We'll need some way to keep track of which elements were promoted to avoid problems here.

> NOTE: Obviously, this `demote` &rarr; `promote` logic shouldn't run if the same element is rapidly closed and reopened, since in that case the logic would not be necessary, and it would cause undesirable flickering.

#### 3&rpar; Consumers Are Responsible for Closing `PseudoBackdrop`s on Click

Not every backdrop is intended to close/demote the elevated element(s) with which it's associated on click. Therefore, we can't unconditionally program the `PseudoBackdrop` to close itself when clicked.

Theoretically, we could add support for a `closeonclick` attribute (or the like) to save developers from having to setup `click` handlers themselves. But how would we do that?

For native elements, we could do the following:

```js
if (element instanceof HTMLDialogElement) element.requestClose();
if (element.popover) element.hidePopover();
```

But what about generic Disclosure Widgets? The `PseudoBackdrop` has no way of knowing the mechanism for closing them. It can demand one in its API contract, but isn't that a bit overreaching, especially considering that we're already requiring `ToggleEvent`s to be dispatched on elements which want to communicate with the `PseudoBackdrop`? Even if it wasn't overreaching, that alone wouldn't solve the problem: Some Disclosure Widgets aren't Web Components having a `close()` method, but rather simple HTML elements toggled with a little bit of CSS and JS. In those cases, there's no reliable way for us to enforce an API contract.

Needless to say... there isn't a clear solution here... so to avoid a mess, we're just requiring developers to setup the `click` listeners themselves. This shouldn't be too difficult to do in a delegated event listener; and developers can do the same hacky `if/then` checks mentioned above in their own applications, except that it _wouldn't_ be hacky (or at least _as_ hacky) because a physical application (rather than this generic library) would know _exactly_ which elements could and should open/close the `PseudoBackdrop`.

#### 4&rpar; Consumers May Not Want an Animation

It seems highly unlikely that anyone would want a backdrop that doesn't animate when it opens or closes, but it's not impossible or unreasonable for someone to desire this. If users don't want an animation, then the `z-index` changes should be applied immediately as the `PseudoBackdrop` opens/closes.

Implementation here can be left open to discussion. Perhaps a user can indicate "no animations please" by a custom attribute. Or perhaps a different solution would be better here... In any case, this should be simple to address, so we intentionally won't define a rigid implementation/solution to this problem.

#### 5&rpar; Behavior on DOM Removal

When an open `popover` is removed from the DOM, it is closed. This is evidenced by the fact that when the `popover` is re-added to the DOM, it is not added to the DOM in an opened state, nor does it appear in the Top Layer.

If a `dialog` was opened with a method like `showModal()`, then its behavior is a little more unique... For example, if an open modal `dialog` is removed from the DOM, then it is removed from the Top Layer and even loses its `:modal` CSS state. However, the element will still retain the `open` attribute (due to the `showModal()` call). So technically, the `dialog` will be "open" when returned to the DOM (and will appear visible), but it will not be in a Top Layer or in a `:modal` state.

The above details make it safe to conclude that browsers effectively close `popover`s and `dialog`s when they are removed from the DOM. Therefore, it is reasonable to argue that the `PseudoBackdrop` should have similar functionality: **_When it is removed from the DOM, the `PseudoBackdrop` should demote any elements that it previously promoted to a higher `z-index`._**

Admittedly, this behavior feels _slightly_ odd since the _elevated element_ (such as a `popover` or an ARIA `menu`) is the real entity being closed, not the `PseudoBackdrop` per se. But since the `PseudoBackdrop` is the element responsible for applying `z-index`es to toggled elements, it makes sense for it to be the element responsible for undoing those `z-index`es.

If you're concerned about it, the likelihood of the `PseudoBackdrop` being removed from the DOM without the elements that it elevated is slim to none. So this design decision shouldn't cause any practical problems.

## Demonstrations / Experiments

Below are some code snippets that we used to get an idea of how browsers behave in different scenarios.

<details>
  <summary><strong><em>Transition Event Management</strong></em></summary>

```html
<!-- HTML -->
<div class="box">Toggle Me</div>
<button type="button">Toggle</button>

<hr />

<div class="box">Remove Me</div>
<button id="remover" type="button">Remove</button>
```

```css
/* CSS */
.box {
  background-color: red;
  transition-property: background-color;
  /* transition-property: background-color, font-size; */
  transition-duration: 2000ms;
  transition-timing-function: ease-in-out;

  &:has(+ button[data-open]) {
    background-color: blue;
    /* font-size: 2rem; */
  }
}
```

```js
// JavaScript
document.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  button.toggleAttribute("data-open");
  if (button.id !== "remover") return;

  const removedBox = button.previousElementSibling;
  setTimeout(() => {
    removedBox.remove();
    setTimeout(() => button.before(removedBox), 250);
  }, 1000);
});

const transitionEvents = ["transitionrun", "transitionstart", "transitioncancel", "transitionend"];
transitionEvents.forEach((type) => {
  // document.addEventListener("type", logTransitionInfo, true);

  const boxes = document.querySelectorAll(".box");
  boxes.forEach((box) => box.addEventListener(type, logTransitionInfo));
});

function logTransitionInfo(event) {
  console.log(event.type);
  console.log(event);

  const animations = event.target.getAnimations();
  console.log("Animations: ", animations);
  console.log("Animation State: ", animations[0]?.playState);
  console.log(`${"-".repeat(50)}\n\n`);
}
```

</details>

<details>
  <summary><strong><em>Dialog and Popover Removals</strong></em></summary>

Note that the demo below may also be useful for verifying what happens when Popover B is opened while Popover A is already open.

```html
<!-- NOTE: You will need to play with these elements in the Developer Console if you want to run accurate experiments on what happens when you spontaneously remove an already-open `popover`/`modal` from the DOM -->

<button type="button" popovertarget="popover">Toggle</button>
<div id="popover" popover>Hello World!</div>

<hr />
<button type="button" command="show-modal" commandfor="modal">Show Modal</button>
<dialog id="modal">
  <button type="button" command="close" commandfor="modal">Close Modal</button>
</dialog>
```

</details>

## Other Miscellaneous Design Decisions

### 1&rpar; Developers Can Place As Many `PseudoBackdrop`s in the DOM As They Like

Although there are _potentially_ some [minor] performance gains that could come from allowing only one `<pseudo-backdrop>` to be in the DOM at a time, it would be hard to enforce and likely lead to a frustrating experience for developers who have valid reasons for adding more than one `PseudoBackdrop` to the DOM. So this is not something we intend to enforce, nor do we think it would be reasonable to enforce.

## Addendum

This section contains additional notes that aren't considered to be primary content in this document, but which nonetheless might be helpful for understanding why the `PseudoBackdrop` was written, and why it was implemented the way that it is.

### A&rpar; Animating `z-index` with CSS Isn't a Viable Option

> NOTE: The following is a modified, reduced excerpt from our notes in another project.

Someone may be wondering, "Why go through all this JavaScript trouble when you could just animate `z-index` with pure CSS?" It's a good question... But the problem is that doing so isn't [practically] possible. Here's the explanation...

An element without a `z-index` attribute is given a default value of [`auto`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/z-index#auto). According to MDN, this value means that:

> The box does not establish a new local stacking context. The stack level of the generated box in the current stacking context is `0`.

Unfortunately, it is impossible to animate a `z-index` between `auto` and some numeric value. If an animation for `z-index` is desired, it _must_ be animated from one numeric value to another numeric value. And this needs to be done with a [`step()`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/easing-function/steps) function, a [`transition-delay`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/transition-delay), or any other technique which will allow all necessary elements to be elevated at the _beginning_ of the _forwards_ animation and to be de-elevated at the _end_ of the _backwards_ animation.

Now, based on what MDN says about `z-index: auto`, you might think, "Okay. All I have to do is give the appropriate elements a default `z-index` of `0`. This will enable me to animate the CSS Property correctly when a Disclosure Widget is toggled."

And that thinking is reasonable! But it is also incorrect... because based on the physical tests that we ran with Safari, setting `z-index: 0` can cause an element to unexpectedly appear _below_ other elements which _don't_ define a `z-index`. So for some reason or another, an element which is placed in a _true_ new Stacking Context and given a value of `0` might appear _beneath_ elements which _don't_ have a true Stacking Context but effectively have `z-index: 0` according to `auto`'s description.

This dilemma makes it impossible for us to set a "dormant"/default `z-index: 0` value on any element which we know will need to be elevated at some future point.

Defaulting the `z-index` to an arbitrary small value (such as `1`) isn't safe either, because it will undoubtedly lead to unexpected bugs. There are tons of unpredictable Stacking Context issues which could result from placing a positive `z-index` on an element by default.

And truth be told... we don't even _want_ a positive `z-index` to be on any elements by default at all. **_What we <u>really</u> want is for the appropriate elements to have <u>no Stacking Context at all</u> when "closed", and to have a sufficiently-high Stacking Context when "open"._** In other words, what we **_really_** want is to animate between `z-index: auto` and `Top Layer`. Of course, this is unrealistic because `z-index: auto` can't be animated, and a `z-index` can't put anything in the `Top Layer` at all. But if we could find a solution which produces something _similar_ to this behavior, that would be enough for us.

Since such an experience is impossible with CSS alone, we have to reach for JavaScript, hence the `PseudoBackdrop`'s existence.
