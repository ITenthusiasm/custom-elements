# Won't Fix

This file documents the collection of _known_ issues/concerns that &mdash; at least as of today &mdash; we don't intend to address. Although we're open to addressing these bugs/concerns in the future, it would need to be proven that there are sufficiently-significant use cases that would motivate resolving these niche, unusual problems. Alongside each known concern, we'll document the reason for neglecting it.

## Caught By AI

### `PseudoBackdrop.#demote()` Can Throw If Called When the Backdrop Is Already Closed (2026-09-16)

<details>
  <summary>AI Proof</summary>

#### Concern #1

**The one thing to double-check — a small regression in the close path**

You changed what the **close** paths operate on. The old code demoted `event.target` (the popover that actually fired the toggle); the new code demotes `backdrop[lastPseudoPopover]`. Those are the same element in a normal open→close cycle, but they diverge when a close arrives without a tracked open — and in that case the new code throws:

```js
static #demote(backdrop) {
  const pseudoPopover = /** @type {HTMLElement} */ (backdrop[lastPseudoPopover]); // null in the edge case
  ...
  pseudoPopover.style.zIndex = ""; // line 130 → TypeError on null
  ...
}
```

Reachable when `lastPseudoPopover` is `null` at close time, e.g.:

- A popover is already open in the markup when the `<pseudo-backdrop>` is inserted, so `connectedCallback` attaches the listener after the open `toggle` fired (the open was missed) — then the close fires and hits line 69 or line 117 with `lastPseudoPopover` still `null`.

`disconnectedCallback` guards against this (line 40); the two close paths (line 69 and, via line 117, the deferred path) do not. The old code sidestepped it entirely by using `event.target`.

If you want to close that gap, the cheapest fix is a guard at the top of `#demote` so all callers are uniformly safe:

```js
static #demote(backdrop) {
  const pseudoPopover = backdrop[lastPseudoPopover];
  if (!pseudoPopover) return;
  ...
}
```

That also makes the `if (this[lastPseudoPopover])` check on line 40 redundant (harmless to keep). Whether this edge is worth handling is your call — if you consider "backdrop inserted after its popover is already open" out of scope, the refactor as written is otherwise correct and Finding #1 is genuinely resolved.

#### Concern #2

**Relocating the backdrop in the DOM while its popover is open.**

1. Popover A open, `lastPseudoPopover = A`, A promoted.
2. Something moves the backdrop — `someContainer.appendChild(backdrop)`, a framework re-parenting/re-ordering a list, etc. A DOM move is a remove+insert, so:
   - `disconnectedCallback` fires → `this[lastPseudoPopover]` is truthy → `#demote(this)` clears A's `z-index` and sets `lastPseudoPopover = null`.
   - `connectedCallback` fires → re-attaches the `toggle` listener. **A is still open** (its state never changed), but `lastPseudoPopover` is now `null`.
3. User closes A → `#handleDelegatedToggle` matches this backdrop → `#demote(this)` (immediate path line 69, or via `#handleTransitionCompletion` line 117) → `pseudoPopover.style.zIndex` on `null` → **TypeError**.

That's a plain DOM move, not a misuse of the insertion order — considerably more plausible than the scenario the doc describes. It's still an uncaught exception with no state corruption (nothing was left promoted — the disconnect already cleared it), so the blast radius is small, but "we move DOM nodes around" is a normal thing frameworks and app code do.

---

</details>

This is a legitimate proof of a possible bug. However, it isn't really a use case in our eyes worth resolving. Practically speaking, it would never make sense to insert a `<pseudo-backdrop>` into the DOM _after_ the target `pseudoPopover` was already opened. If you want the desired UX, you would always be forced to insert the element into the DOM _before_ opening the `pseudoPopover`. Otherwise, the "opened elements" wouldn't be guaranteed to appear at the proper `z-index` levels (nor would they have the proper backdrop experience/styling). So developers should never get here.

Similarly, it would never make practical sense to relocate the `<pseudo-backdrop>` until **_after_** the `pseudoPopover` associated with it was closed. For one thing, the bug/concern isn't even a possible UX for native `<dialog>`s and `popover`s, which have the `::backdrop` attached to them and therefore cannot be removed separately from their owners. For another thing, moving an open `<dialog>` or `popover` is a use case that doesn't make sense and which automatically closes the elevated element (or causes it to lose Top Layer promotion and `:modal` state). If developers want to hide a native backdrop, they close the popover; if they want to move a native backdrop without confusing users, they need to close the popover first; there is no reason for `<pseudo-backdrop>` to be treated differently from these native browser experiences.

Additionally, it doesn't make sense to move `<pseudo-backdrop>` around in the DOM since it's always `position: fixed` with `inset: 0` when styled correctly; it should have a static location in the DOM (in which case a JS framework should be guaranteed not to cause problems either as long as all code is written correctly). Lastly, even if code was written to avoid throwing errors, we _can't_ prevent jank User Experiences: A `<pseudo-backdrop>` that animates in/out (which is common in modern applications) would be _unable_ to animate correctly on the `disconnectedCallback()` path.

`disconnectedCallback()` is a last-ditch cleanup effort which itself _assumes_ that the `pseudoPopover` and `elevatedSibling` associated with it are being removed with it. It is in no way meant to be behavior that is heavily relied upon in web applications. Our only concern is that when people _remove_ `pseudoPopover`, `elevatedSibling`, and `PseudoBackdrop` back-to-back in any order, no errors should be thrown and all final states should be correct. We can document these expectations (e.g., users should close their popovers when removed if the browser doesn't do it automatically), but supporting already-invalid User Experiences (jank backdrop exits) makes no sense.

It is theoretically possible that this is an edge case that developers can legitimately run into. But the simple fix is to constrain one's code to comply with what we just said above. If that expectation is proven to be unreasonable by developers with real-world use cases in the future, then we will more than happily resolve the bug.

As things stand, "magic nullability checks" can be just as confusing as "magic numbers", so I'd rather avoid them (and all the extra code comments that need to be added alongside them).

### Changing `data-elevates` Mid `open` &rarr; `...` &rarr; `close` Cycle Leaves "Elevated Siblings" Stranded (2026-09-19)

Imagine the following scenario:

- User toggles open a `popover` with a defined `data-elevates` attribute.
- User closes the `popover`.
- **_Mid closing animation_**, developer points `data-elevates` to a different element.
- User then reopens the `popover` **_before the closing animation finishes_**.
- At some future point, the user toggles the `popover` closed and allows the closing animation to fully complete.

In this scenario, something unusual happens...

1. First, on `open`, the `PseudoBackdrop` elevates Popover A and Elevated Sibling A and stores them for future demotion. (_good_)
2. Second, on **_re_**-open, the `PseudoBackdrop` elevates **and stores** Popover A and Elevated Sibling **_B_**, because `data-elevates` was changed in mid cycle.
   - This means 3 elements are now elevated: Popover A, Elevated Sibling A, and Elevated Sibling B. (_bad_)
   - It also means **_Elevated Sibling A no longer stored_**. (_bad_)
3. Lastly, on `close`, the `PseudoBackdrop` demotes Popover A and Elevated Sibling B, because those were the elements it was tracking. But it **_does not_** demote Elevated Sibling A because it lost track of that element during the `close` &rarr; re-`open` cycle.

This produces a jank UI state because an element can be left elevated at a higher `z-index` when it shouldn't be.

That said, this scenario is almost entirely unrealistic. **_It would never make practical sense for someone to change `data-elevates` mid `open` &rarr; `...` &rarr; `close` cycle._** So for now, we don't intend to resolve this "bug". As with the previous "issue", we _may_ resolve it in the future if there are _legitimate_, real world use cases that are suffering from this behavior.

### Using Anything other than `CSSTransition`s to Animate the Backdrop Produces Invalid Behavior (2026-09-19)

<details>
  <summary>AI Proof</summary>

**`getAnimations()` isn't filtered to transitions**

`PseudoBackdrop.js:91` and `PseudoBackdrop.js:117` use `backdrop.getAnimations().length` as a proxy for "is a transition still running." But `Element.getAnimations()` returns all animations on the element — CSS Transitions, CSS `@keyframes` animations, _and_ Web Animations — not just `CSSTransition`s.

So if a backdrop has any concurrent non-transition animation on itself (e.g., an infinite decorative gradient/shimmer via `@keyframes`, which is a perfectly normal thing to put on a full-screen backdrop), the logic breaks:

- `#handleTransitionCompletion` (line 117): `if (backdrop.getAnimations().length) return;` is **always** true → listeners are never removed and `#demote` never runs → **the popover/sibling stay elevated forever after close, and the transition listeners leak**.
- `#handleTransitionrun` (line 91): the finished-instant-toggle guard is defeated (length is always ≥ 1), so it can promote spuriously.

... The fix is to filter: `backdrop.getAnimations().filter((a) => a instanceof CSSTransition).length`. (This is a superset of the `@keyframes` case the doc already calls out as "janky" — that one degrades gracefully because `@keyframes` don't fire `transitionrun`; this one actively corrupts state.)

</details>

This is a legitimate and impressive find. However, there are two problems with it:

First, the architecture document points out under [_Backdrop Animations_](./architecture.md#backdrop-animations) that the `PseudoBackdrop` should only be animated with CSS Transitions. Perhaps it wasn't clear that _users_ (not just the maintainers) shouldn't try to apply any other kinds of animations to the element either. We can make this constraint explicitly clear in the component's documentation.

Second, the primary situations where `PseudoBackdrop` shines are those where someone needs to elevate _multiple_ elements at the same time (because this behavior isn't natively supported by browsers today). Outside of that use case, a regular `::backdrop` (which requires `<dialog>` or `popover`) is virtually always more desirable. Even if Browser Compatibility is a concern, the `<dialog>` element has been `Baseline Widely Available` for quite sometime (and `popover`s will be `Baseline Widely Available` in just a few months), so the benefits that come with leveraging the native `dialog::backdrop` far outweight whatever the `PseudoBackdrop` can offer.

This is an easy-to-resolve problem, but it comes with a performance hit: Changing `backdrop.getAnimations().length` to `backdrop.getAnimations().filter().length` introduces an `O(n)` operation into our check logic. Granted, _hopefully_ people won't go crazy and animate tons of properties at once; if they don't, then the time complexity should always be small or "near constant". But still: Why introduce a performance hit for something that people likely _won't_ use the `PseudoBackdrop` for?

If people need this in the future, the fix is easy, as documented by the LLM.
