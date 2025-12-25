# Why the `Combobox` Component Is _THE_ Solution for Accessible `combobox`es

During my time as a software engineer, I've had the opportunity to play with different [`combobox`](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/)[^1] component libraries, and I've even (re)written my own `combobox` solution 5+ times across 3 different JS Frameworks (React, Vue, and Svelte), with each re-write having its own incremental improvements.

[^1]: Combobox components have also gone by the terms "dropdown" and "custom select". They are effectively more-advanced `<select>` elements which may or may not support filtering/autocompletion.

When you (re)write and/or interact with a component enough times, you begin to get a clearer picture of the real underlying problems that the component needs to solve. With these insights, you might not be able to come up with a "perfect" solution, but you _will_ be able to come up with a solution that legitimately addresses all of the underlying problems. And that's what our library's `Combobox` component successfully does.

I think most frontend developers already understand the limitations of the currently-existing [`<select>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/select) element, and why a custom component is needed to provide something that is both A&rpar; more easily re-styled and B&rpar; optionally filterable. I assume we all agree that this is the most fundamental issue which all `combobox` component libraries need (and aim) to address, so I don't want to spend my time addressing that concern.

Instead, I want to address the other important problems which modern `combobox` solutions have failed to address, and why this library's `Combobox` component (or, more specifically, [form-associated Custom Elements](https://web.dev/articles/more-capable-form-controls) as a whole) is the _real_ solution that everyone has been longing for. There are 5 unsolved problems that I've seen in modern `combobox` libraries (and in my older iterations of the component):

1. Form Compatibility
2. Event Handling Support
3. Framework Agnosticism
4. Accessibility
5. Customizability

Let's address each one.

## 1&rpar; Form Compatibility

When I say "form compatibility", I'm referring to a component's ability to behave like a native form control. Sure, a user might be able to click a `combobox` component, click one of its `option`s, and see the UI update along the way. Great! But does the component satisfy **_all_** of these basic requirements?

- Automatically participates in form validation
- Automatically participates in form submission
- Supports the native `input`/`change` events
- Gets exposed on the owning form's [`elements`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/elements) property

> Note: There are even more requirements for native form controls than the ones listed here, but these are perhaps the most pertinent.

If it fails to meet _any_ of these requirements, then the component _does not_ behave like a native form control. This matters for the sake of code maintainability/simplicity: There's [_a lot_](https://medium.com/better-programming/before-you-reach-for-another-js-form-library-266b00726f7b) that the browser's native form APIs enable you to do; and if you lean into the browser's tooling, your code will be simple and performant. By contrast, leaning on tools _outside_ the browser will typically make your code unnecessarily complex. Here's an example:

Using the browser's native features, you can keep track of your form's _entire data_ by using the [`FormData`](https://developer.mozilla.org/en-US/docs/Web/API/FormData) class. Additionally, every [`<form>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/form) element has a [reference to all of its fields](https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/elements), and every field has a [reference to its owning form](https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/form). This means that as long as you have a reference to your `<form>` element (or one of its fields), you have easy access to the entire form's data and to every form control owned by the form (_even if the form control is located outside the form_).

The moment you start using a component that _doesn't_ function like a native form control, you lose the ability to access all of your form's data (and its elements) in a _central_ place (i.e., your `<form>` element). Historically, this has forced developers to reach for complex state management libraries to manage their form's data in a _centralized_ location. But reaching for such libraries increases a codebase's complexity and bundle size.[^2] Additionally, since these libraries are often framework-specific (e.g., React support only), they require you to learn skills that may not be transferrable to your next project.

[^2]: One example: If you're working in a codebase where every single one of your "primitive" form control components (e.g., `<Input>`) must leverage something like React's [`useContext()`](https://react.dev/reference/react/useContext) hook (or a Higher Order Component) to look for some kind of [form context provider](https://react.dev/reference/react/createContext) which your form state management library requires, then you should be able to understand what I'm talking about. Your state management library has bled into all of the form control components that you've written, and it has locked your components into thinking like the specific library that you're using. All of this overhead could be skipped if you were able to get away with using only the browser's native tooling (like `FormData`).

Some libraries (like `react-select`) try to circumvent the Form Compatibility problem by leveraging things like [hidden `<input>`s](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/hidden). However, this approach doesn't enable the component to fully operate as a form control recognized by the browser. Additionally, it often introduces other problems (such as limited or absent support for browser-based form validation or event delegation).

The only solution to the Form Compatibility problem today is [form-associated Custom Elements](https://web.dev/articles/more-capable-form-controls#form-associated_custom_elements), which enable web components to be recognized by the browser as form controls. Since our library's `Combobox` component uses a form-associated Custom Element, it behaves just like the native form controls. This means you can continue to use the browser APIs that you are familiar with, empowering you to ditch the state management libraries and write simpler, more maintainable code.

## 2&rpar; Event Handling Support

Native form controls support events like [`input`](https://developer.mozilla.org/en-US/docs/Web/API/Element/input_event) and [`change`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/change_event), which help you track when a user has updated a form control's value. They also support standard events like [`focusin`](https://developer.mozilla.org/en-US/docs/Web/API/Element/focusin_event) and [`focusout`](https://developer.mozilla.org/en-US/docs/Web/API/Element/focusout_event), which tell you when a user visits or leaves your form fields. When combined with techniques like [event delegation](https://gomakethings.com/why-is-javascript-event-delegation-better-than-attaching-events-to-each-element/) these events provide you with a succinct, easy, and intuitive way to mark fields as `dirty`/`visited`, or to perform form validation.[^3]

[^3]: To get an idea of how the browser helps you manage dirty/visited/validation states with ease, see the article: [_Before You Reach for Another JS Form Library…_](https://medium.com/better-programming/before-you-reach-for-another-js-form-library-266b00726f7b)

When a `combobox` component _doesn't_ support these native events, you're stripped of your ability to use event delegation for managing a field's validity, dirty, and visited states. This, again, forces you to reach for a complex state management library that supports these features. The frustrating thing is that these libraries effectively end up re-inventing the logic that browsers natively support today; so it's an unnecessary waste of bundle size space &mdash; all because the native DOM events aren't properly supported by a component.

When `combobox` component libraries fail to properly support the native DOM events, it's usually for one of two reasons:

**1&rpar; The component is built in a JS Framework.** Typically, this means that "event handlers" don't really exist for the component because it doesn't [dispatch](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/dispatchEvent) any real DOM events. Instead, the component accepts callback functions which are invoked when the component's value changes (or some other user action occurs). This might sound useful, but it makes event delegation impossible because only the component itself can "listen" for "events" &mdash; not a higher up entity like the wrapping `<form>`.

**2&rpar; The component splits value management and user interactivity across different elements.** Oftentimes, modern `combobox` components will use a hidden `<input>` to manage the component's value. (This is to enable the component's data to be submitted to the server, though this approach has several limitations.) Then, they will use other elements (like visible `<button>`s or `<input>`s) to handle user interactivity, like expanding/collapsing the `combobox`.

Unfortunately, this presents a dilemma: If the event is dispatched on the hidden input, then the event listener won't have access to the element shown to the user (and thus won't be able to perform relevant UI updates). However, if the event is dispatched on the visible, interactive element, then the event listener won't be able to update the component's underlying value. There are hacks to circumvent this problem, but they will complicate your code and won't cover all edge cases.

To support the browser's native tools for managing form validation and other form field states, events must be handled and delegated _properly_. For that to happen, the events _must_ be dispatched from a _single_ element which is responsible for both A&rpar; integrating the component into the native `<form>` element, and B&rpar; displaying UI updates.

As with the Form Compatibility problem, this need can only be addressed with form-associated Custom Elements (at least as of today). The `Combobox` component is such a component, and it supports all of the aforementioned DOM events (and more).

## 3&rpar; Framework Agnosticism

Many of the popular `combobox` components today are built on top of JS Frameworks. The disadvantage of this is obvious: If a component is written on top of React, then you cannot use the component outside of React. Consequently, whenever you need to use a toolchain that doesn't include React, all of your experience and knowledge with the component will go to waste. You'll have to learn a new `combobox` component library (and very likely, a new complex form state management library) to accomplish what you need.

With a Custom Element like the `Combobox` component, you are given a solution that works with _all_ toolchains. Additionally, because Custom Elements are built on top of the browser (instead of being built on top of a JS framework), your codebase will be much less susceptible to breaking changes that block application upgrades.

## 4&rpar; Accessibility

The accessibility problem can actually be solved with or without Custom Elements.[^4] Even so, many `combobox` component libraries fail to comply with the [basic accessibility requirements of `combobox`es](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/). Our library's `Combobox` component, by contrast, meets these requirements and is highly accessible to a diverse set of users.

[^4]: However, the [`ElementInternals`](https://developer.mozilla.org/en-US/docs/Web/API/ElementInternals) interface, which exists exclusively on Custom Elements, gives Custom Elements a greater advantage when it comes to accessibility support.

## 5&rpar; Customizability

Most `combobox` components are written in JS Frameworks which require developers to write functional components (or components which more or less behave like functional components). This makes it incredibly difficult for a developer to override a component's behavior. If you really like a component, but there's an unalterable behavior which makes the component a deal-breaker, you have to go back to the internet to search for a different library.

Additionally, if the component does not give you easy access to the underlying elements used to create the `combobox`, it will be rather difficult to customize its styles. You can also encounter this problem if the component ships with bloated or overreaching CSS.

Because the `Combobox` component is built using Custom Elements, you can easily override the component's behavior by [extending](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/extends) the element of interest and overriding the appropriate properties or methods. As for styling, the `Combobox` component exposes _all_ of the underlying elements to the developer, and it gives _them_ the freedom to decide how to style the component. They can use the library's CSS, use their own CSS, or use a combination of the two.

## Conclusion

Robust, customizable, and form-associated Custom Elements are the way to build `combobox` components in today's world. Such components give developers what the want (a stylable, optionally-filterable `<select>` element) without sacrificing indispensable features like Form Compatibility. This is exactly what our library's `Combobox` component does, and I'm excited to see the possibilities (and new innovations) that it unlocks in the future.
