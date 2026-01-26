# Why You Can (and Should) Finally Ditch Your Form Library

> _Your greatest need in the form ecosystem is not more sophisticated form libraries; it’s components that integrate directly with native forms._

Forms are one of the most important and integral parts of all web applications. This is because they are the necessary means by which users can perform actions on your site: logging in, saving/updating their data, searching through data, and more.

Consequently, it's no surprise that myriads of form libraries exist today to help developers manage their forms. However, I would argue that most of these libraries (including popular ones like React Hook Form and TanStack Form) provide the wrong abstraction.

More specifically, I would argue that most form libraries provide the wrong abstraction because **_they try to solve the wrong problem_**. Typically, the problem that form libraries try to solve is that of **_state management_**: They give you a single place to track all of your form state. And while they're at it, they help you track error messages, dirty states and the like. On the surface, this sounds great; **_but these are problems that browsers have already solved_**...

Here are some examples of these already-solved problems:

1. **You can access your entire form's data with `FormData`.** Calling [`FormData`](https://developer.mozilla.org/en-US/docs/Web/API/FormData) with an `HTMLFormElement` will give you an object holding all of your form's data. Thus, you don't need a library to store your form's state in a central location; the browser is already storing it.
2. **Each `<form>` element has access to ALL of its fields.** You can iterate over every form field using the [`HTMLFormElement.elements`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/elements) collection. Or, you can look up a field by `name` using [`HTMLFormElement.elements.namedItem(name)`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormControlsCollection/namedItem).
3. **Every field can access its owning `<form>`.** Every field has a [`form`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/form) property that points to its owning form. Pairing this fact with the first one, **_this means that if you have access to a SINGLE field ANYWHERE in your application, then you also have access to ALL of the owning form’s data AND its fields_**.
   - This makes it very easy to use a basic event handler to validate one field (e.g., `Confirm Password`) when another field (e.g., `Password`) changes.
4. **Browsers have native solutions for field validation.**[^1] Each form control has a [`ValidityState`](https://developer.mozilla.org/en-US/docs/Web/API/ValidityState) which tracks the error state of the field and is kept up-to-date as the field's value is changed. Error messages related to these states appear under the [`validationMessage`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/validationMessage) property. Custom error messages can also be set with the help of event handlers and [`setCustomValidity()`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/setCustomValidity).

> Browsers provide solutions for other needs as well, such as easily identifying dirty and/or visited fields. You can learn more about what can be accomplished _without_ form libraries in the article [_Before You Reach for Another JS Form Library..._](https://medium.com/better-programming/before-you-reach-for-another-js-form-library-266b00726f7b).

[^1]: Yes, the astute among you will note that there are some limitations with the browser's native form validation. I will address that concern later in this article. Stay with me.

By attempting to solve the **_state management_** problem which browsers have _already solved_, form libraries end up re-inventing the wheel: Instead of using `FormData`, they re-create and manage the entire form's state in a separate JS object; instead of leveraging a field's `ValidityState`, they re-create and track their own error messages; and so on. Unfortunately, this means many form libraries bring more overhead and bundle size bloat than they're worth. And in some cases, their [wheel](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/disabled) reinvention produces [unexpected bugs](https://github.com/react-hook-form/react-hook-form/issues/6690).

So why are all of these form libraries re-inventing the wheel? Well, it's because they're trying to solve the _real_ problem the _wrong_ way. **_The real problem isn't that developers need more-sophsiticated form state management libraries. Rather, it's that they need custom components which can integrate directly with native forms._** When developers attempt to solve this problem by creating form state management libraries, they are _forced_ to re-invent what browsers already do, often leading to edge-case bugs, more verbose code, and unnecessary bundle size bloat.

The reason that this is true might not be immediately apparent. So let me demonstrate this with an example. I'll show you every step of abstraction that a developer is _forced_ to take when they _don't_ have fields that integrate with the native `<form>` element. We'll tackle this in 5 steps:

1. [Starting off with a Simple Form](#starting-off-with-a-simple-form)
2. [Introducing a _Custom_ Form Control](#introducing-a-custom-form-control)
3. [The Slippery Slope of Form State Management](#the-slippery-slope-of-form-state-management)
4. [How Form Libraries Push You _Further_ Down the Slope](#how-form-libraries-push-you-further-down-the-slope)
5. [Escaping the Pit with Form-Associated Custom Elements](#escaping-the-pit-with-form-associated-custom-elements)

After that, we'll do a quick recap of what we learned. Then we'll briefly address an elephant in the room (👀) before wrapping up.

Trust me, this article is well worth the read. Even if you don't agree with it, it will give you a greater understanding of _what_ you've been doing with your forms, _why_ you've been doing it, and _how_ you can make your forms much less complicated.

## Starting off with a Simple Form

Imagine that you're writing a Sign Up Form for an application in React. This isn't anything that requires a form validation library.

```tsx
export default function SignUpForm() {
  return (
    <form method="post" action="<MY_URL>">
      <label htmlFor="email">Email</label>
      <input id="email" name="email" type="email" pattern="<STRICT_EMAIL_REGEX>" required />

      <label htmlFor="password">Password</label>
      <input id="password" name="password" type="password" pattern="<PASSWORD_REGEX>" required />

      <button type="submit">Submit</button>
    </form>
  );
}
```

The browser will validate these form fields whenever the user attempts to submit the form. Assuming that the regexes which you supply to the [`pattern`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/pattern) attributes are correct, the browser will prevent form submission as long as the `email` and `password` fields are empty or malformed. Additionally, it will display an error message for any field that is invalid. Once the user has corrected the form data, the browser will allow the user to submit it to `<MY_URL>`.

If you prefer to handle the validation manually, you can give the `<form>` element the [`novalidate`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/form#novalidate) attribute and perform the validation in a `submit` handler.[^2]

```tsx
export default function SignUpForm() {
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const valid = form.reportValidity(); // Validates the entire form
    if (!valid) event.preventDefault(); // Prevent the browser from submitting the form if a field is invalid.
  }

  return (
    <form method="post" action="<MY_URL>" noValidate onSubmit={handleSubmit}>
      {/* Form Fields */}
    </form>
  );
}
```

[^2]: Again, the astute among you will know of the limitations of [`HTMLFormElement.reportValidity()`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/reportValidity), as well as the limitations of _overly-complex_ `pattern` settings. As I said before, we will address these concerns later. For now, let's assume that `reportValidity()` meets every developer's error messaging needs, and that `pattern` is sufficient. And let's stay focused on the topic of _why_ native form controls are what developers _really_ need.

And if you prefer to perform the API request manually as well, you're welcome to do so:

```tsx
import { useState } from "react";

export default function SignUpForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); // Prevent the browser from submitting the form at all. We will submit the data manually.
    const form = event.currentTarget;
    const valid = form.reportValidity();
    if (!valid) return;

    setIsSubmitting(true);
    const headers = new Headers({ "Content-Type": "application/x-www-form-urlencoded" });
    const response = await fetch(form.action, { headers, method: form.method, body: new FormData(form) });
    // Do something with the response...
    setIsSubmitting(false);
  }

  return (
    <form method="post" action="<MY_URL>" noValidate onSubmit={handleSubmit}>
      {/* Form Fields */}
      <button type="submit" disabled={isSubmitting}>
        Submit
      </button>
    </form>
  );
}
```

So far, so good. We were able to do everything that we needed without pulling in a form library. But life won't always be so simple...

## Introducing a _Custom_ Form Control

Life is nice if we're only using native form controls, or if we're using React Components that are effectively wrappers over native form controls. But life gets significantly more complicated once we start introducing components that _aren't_ expressed as native form fields.

For example, you may decide to write your own `<Select>`/`<Option>` components to create an accessible [`combobox`](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) that is far more beautiful, flexible, and user-friendly than the native [`<select>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/select) element. This is a common use case in web forms due to the `<select>` element's rigidity and limited capabilities.

Let's say that our Sign Up Form is being used on an e-commerce site, and that we want to add a `Shipping Address` section to it which accepts valid addresses in the United States of America. For the US state selection, it would make sense to use the `<Select>` component like so:

```tsx
<Select>
  <Option value="">Choose a State</Option>
  <Option value="AL">Alabama</Option>
  <Option value="AK">Alaska</Option>
  {/* Other Options ... */}
</Select>
```

Assuming that you're trying to meet the accessibility requirements for `combobox`es, your `<Select>` component might render HTML which looks like this under the hood:

```html
<div data-select-container>
  <div role="combobox" aria-controls="LISTBOX_ID" aria-expanded="false" aria-activedescendant="" tabindex="0">
    CURRENT_OPTION_LABEL
  </div>
  <ul id="LISTBOX_ID" role="listbox">
    <li id="option-choose-a-state" role="option" data-value="">Choose a State</li>
    <li id="option-alabama" role="option" data-value="AL">Alabama</li>
    <li id="option-alaska" role="option" data-value="AK">Alaska</li>
    <!-- Other Options ... -->
  </ul>
</div>
```

> Note: We won't be doing a deep dive on accessibility attributes or [`data-*` attributes](https://developer.mozilla.org/en-US/docs/Web/HTML/How_to/Use_data_attributes) here. To learn more about accessible `combobox`es, see [MDN's Documentation](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/combobox_role).

Of course, the `<Select>` component will have to implement the JS logic needed to make it work properly. This includes implementing the logic for option navigation, tracking the currently-selected value, and updating the option label displayed by the `div[role="combobox"]`.

Unfortunately, the value that the `<Select>` component maintains internally _will not_ be visible to the native `HTMLFormElement`. And this is where things start to go **_horribly_** wrong.[^3]

[^3]: Attempting to solve this problem with `<input type="hidden">` is clever, but it causes other problems that we don't have time to address in this article. So yes, things still go **_horribly wrong_** even with `<input type="hidden">`, especially when it comes to delegated event handling.

## The Slippery Slope of Form State Management

Because the `<Select>` component shown above can't express its value (or even its own existence) in a way that the `HTMLFormElement` can understand, we end up in a situation where some of our form data is contained by the `HTMLFormElement` and other parts of our form data are contained in reactive state. Attempting to maintain and reconcile 2 separate sources of truth is a recipe for disaster. So we decide to represent **_all_** of the form's data as reactive state to keep a single source of truth. _"We have no other choice."_ 💀

```tsx
import { useState } from "react";
import Select, { Option } from "./components/Select";

export default function SignUpForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [data, setData] = useState<Record<string, unknown>>({});
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const valid = form.reportValidity(); // DANGER: Uh-oh... This only works for native form controls...
    if (!valid) return;

    setIsSubmitting(true);
    // NOTE: Now we have to send `JSON`. This also impacts our server logic...
    const headers = new Headers({ "Content-Type": "application/json" });
    const response = await fetch(form.action, { method: form.method, body: JSON.stringify(data), headers });
    // Do something with the response...
    setIsSubmitting(false);
  }

  // NOTE: We use `onInput` instead of `onChange` because it protects against rare bugs that can happen in React
  function handleInput(event: React.FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const field = event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    if (field.form !== form) return;

    setData((prev) => ({ ...prev, [field.name]: field.value }));
  }

  function handleCustomChange(field: { name: string; value: string }) {
    setData((prev) => ({ ...prev, [field.name]: field.value }));
  }

  return (
    <form method="post" action="<MY_URL>" noValidate onInput={handleInput} onSubmit={handleSubmit}>
      <label htmlFor="email">Email</label>
      <input id="email" name="email" type="email" pattern="<STRICT_EMAIL_REGEX>" required />

      <label htmlFor="password">Password</label>
      <input id="password" name="password" type="password" pattern="<PASSWORD_REGEX>" required />

      <fieldset>
        <legend>Shipping Address</legend>

        <label htmlFor="address.line1">Address 1</label>
        <input id="address.line1" name="address.line1" required />

        <label htmlFor="address.line2">Address 2</label>
        <input id="address.line2" name="address.line2" />

        <label htmlFor="address.city">City</label>
        <input id="address.city" name="address.city" required />

        <div id="state-label">State</div>
        <Select name="state" requried aria-labelledby="state-label" onChange={handleCustomChange}>
          <Option value="">Choose a State</Option>
          <Option value="AL">Alabama</Option>
          <Option value="AK">Alaska</Option>
          {/* Other Options ... */}
        </Select>
      </fieldset>

      <button type="submit" disabled={isSubmitting}>
        Submit
      </button>
    </form>
  );
}
```

Thanks to the power of [event delegation](https://gomakethings.com/why-is-javascript-event-delegation-better-than-attaching-events-to-each-element/), we were able to place a _single_ `input` event listener on the wrapping `<form>` element to process any form state managed by our native form controls. This listener is safe to use because it only acknowledges `input` events that are dispatched from the fields which belong to our `<form>` of interest. However, we'll still have to pass `handleCustomChange` directly to _every_ React Component that doesn't integrate with the native form, such as the `<Select>` component.

Although the solution above may look clever, there are two noteworthy problems with it:

**_First, custom React components like the `<Select>` component DO NOT have a real [`ValidityState`](https://developer.mozilla.org/en-US/docs/Web/API/ValidityState) that the native `<form>` element can run validation against when `form.reportValidity()` is called._** This means that we're stuck in a similar situation as before: Our error states are spilt between the real form controls and reactive state. And yet again, we'll have to resolve this issue by creating event listeners that pump every native form control's error state into a stateful `error` object.

```tsx
const [errors, setErrors] = useState<Record<string, string>>({});
// Define listeners for updating error state...
```

**_Second, it's very common to split out portions of a larger form into separate components._** For example, you might request _both_ a Shipping Address _and_ a Billing Address on the Sign Up Form of your e-commerce site. And you might split these out into their own components.

```tsx
<form method="post" action="<MY_URL>" noValidate onInput={handleInput} onSubmit={handleSubmit}>
  <label htmlFor="email">Email</label>
  <input id="email" name="email" type="email" pattern="<STRICT_EMAIL_REGEX>" required />

  <label htmlFor="password">Password</label>
  <input id="password" name="password" type="password" pattern="<PASSWORD_REGEX>" required />

  <ShippingAddressSubForm />
  <BillingAddressSubForm />
  <button type="submit" disabled={isSubmitting}>
    Submit
  </button>
</form>
```

**_But once you start splitting out nested sub-components, you'll have to use something like [React Context](https://react.dev/learn/scaling-up-with-reducer-and-context) (or [egregious prop drilling](https://kentcdodds.com/blog/prop-drilling)) to ensure that every native form control AND custom React component can properly access/update the entire form's state (including error states, etc.)._**

Both of these concerns are worsened by the fact that you will probably have to work with **_even more_** kinds of custom React Components which are meant to _look_ like form fields yet fail to actually _integrate_ with the native `<form>` element. (And we haven't even addressed how all of this forces decisions on your server's architecture; we don't have time to either.)

It very quickly becomes apparent to you that this is getting **_way_** out of hand, and you **_don't_** want to write all of the form/error/whatever state management logic yourself. (Who would?) This is likely where you reach for a form library, but most form libraries unfortunately _shove you further_ down the slippery slope instead of helping you escape it. **_Remember: All of these problems originated because our custom React Components DID NOT integrate with the native `<form>` element._**

The simple solution to this problem is to create a component which _can_ integrate with the native `<form>` element. For example, instead of using a `<div role="combobox">`, our `<Select>` component could use a [form-associated](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/attachInternals) Custom Element which leverages [`ElementInternals`](https://developer.mozilla.org/en-US/docs/Web/API/ElementInternals) to [set its own form value](https://developer.mozilla.org/en-US/docs/Web/API/ElementInternals/setFormValue) and [`ValidityState`](https://developer.mozilla.org/en-US/docs/Web/API/ElementInternals/setValidity). If this approach was used for the `<Select>` component, then we wouldn't need any of this crazy form state management at all.

However, since many form libraries tend to address the **_symptomatic_** form state management problem instead of the **_root_/_causal_** native `<form>` integration problem, they push developers further down the slippery slope of crazy state management. Let's explore what that looks like further...

## How Form Libraries Push You _Further_ Down the Slope

We (understandably) acknowledge that we don't want to write our own form state management library. So we download an NPM form library like `React Hook Form` or `TanStack Form`. Let's go with `React Hook Form` since `TanStack Form`'s syntax is egregiously (and likely unnecessarily) verbose. After adopting `React Hook Form`, our code might look something like this:

```tsx
import { useForm, FormProvider } from "react-hook-form";

export default function SignUpForm() {
  const form = useForm();
  const handleSubmit = form.handleSubmit((data, event) => {
    // NOTE: This callback will only run if every form control passes validation.
    // And React Hook Form will always call `event.preventDefault()` for us.

    const { action, method } = (event as React.FormEvent<HTMLFormElement>).currentTarget;
    const headers = new Headers({ "Content-Type": "application/json" });
    const response = await fetch(action, { method, body: JSON.stringify(data), headers });
    // Do something with the response...
  });

  return (
    <form method="post" action="<MY_URL>" noValidate onSubmit={handleSubmit}>
      <label htmlFor="email">Email</label>
      <input id="email" type="email" {...form.register("email", { pattern: /<STRICT_EMAIL_REGEX>/, required: true })} />

      <label htmlFor="password">Password</label>
      <input
        id="password"
        type="password"
        {...form.register("password", { pattern: /<PASSWORD_REGEX>/, required: true })}
      />

      <FormProvider {...form}>
        <ShippingAddressSubForm />
        <BillingAddressSubForm />
      </FormProvider>
      <button type="submit" disabled={form.formState.isSubmitting}>
        Submit
      </button>
    </form>
  );
}
```

The `<FormProvider>` is needed to ensure that all sub-components have access to the form state and helper methods managed by the `form` variable. This means that every sub-component which renders a form control will also need to use React Hook Form's `useFormContext()` hook. Additionally, remember that all custom React Components, such as the `<Select>` component, **_must now be designed_** in a way that enables them to integrate properly with React Hook Form.

Eventually, you realize that having to call `register()` over and over again in your JSX is annoying (and easily forgotten). So you decide to force **_every_** form control in your application &mdash; both native controls and custom React Components &mdash; to `useFormContext` for you.

```tsx
// New `<Input>` component
import { useFormContext } from "react-hook-form";
import type { RegisterOptions } from "react-hook-form";

interface InputProps extends React.ComponentPropsWithRef<"input"> {
  validationOptions: Omit<RegisterOptions, "ref" | "onChange" | "onBlur">;
}

function Input({ ref, name, onChange, onBlur, validationOptions, ...rest }: React.ComponentPropsWithRef<"input">) {
  const { register } = useFormContext();
  return <input {...props} {...register(name, { ref, onChange, onBlur, ...validationOptions })} />;
}
```

```tsx
// New Form Setup
import { useForm, FormProvider } from "react-hook-form";
import Input from "./components/Input";

export default function SignUpForm() {
  const form = useForm();
  const handleSubmit = form.handleSubmit((data, event) => {
    /* ... */
  });

  return (
    // `<FormProvider>` must now wrap EVERYTHING in our form.
    <FormProvider {...form}>
      <form method="post" action="<MY_URL>" noValidate onSubmit={handleSubmit}>
        <label htmlFor="email">Email</label>
        <Input
          id="email"
          name="email"
          type="email"
          validationOptions={{ pattern: /<STRICT_EMAIL_REGEX>/, required: true }}
        />

        <label htmlFor="password">Password</label>
        <Input
          id="password"
          name="password"
          type="password"
          validationOptions={{ pattern: /<PASSWORD_REGEX>/, required: true }}
        />

        <ShippingAddressSubForm />
        <BillingAddressSubForm />
        <button type="submit" disabled={form.formState.isSubmitting}>
          Submit
        </button>
      </form>
    </FormProvider>
  );
}
```

Your custom form fields (e.g., `<Select>`) would have had to integrate with React Hook Form using `useFormContext()` anyway; so you don't feel bad about imposing it everywhere else. However, one thing that is underestimated here is how deeply (and perhaps unhealthily) this couples your application with React Hook Form.

Now you won't be able to use a single one of your primitive form controls without a `<FormProvider>` from `React Hook Form`. (This is an odd DX.) You're also setting yourself up for a headache if the library ever stops being maintained, or it puts you in a position where you're not able to upgrade other NPM packages easily.

I encountered the former problem at a large, publicly-traded company (which I cannot disclose). We used [Redux Form](https://redux-form.com/8.3.0/). But Redux Form stopped being maintained because people started realizing its complications and performance issues. Yet all of our components were linked to Redux Form, and we couldn't perform certain critical package upgrades for as long as we kept a dependency on it. So we had to migrate **_all_** of our form controls from Redux Form to another library, _then_ perform the necessary package updates. But... this put us back in a position where we were waiting for the next package migration problem...

I encountered the latter problem at a different company. We were using [`@hookform/resolvers`](https://www.npmjs.com/package/@hookform/resolvers) to enable us to use [`zod`](https://zod.dev/) in conjunction with [`react-hook-form`](https://react-hook-form.com/). We were interested in migrating Zod from version 3 to version 4, but that was impossible with our existing version of `react-hook-form`, which we didn't want to upgrade to newer major versions lest we encounter unexpected, application-wide breaking changes. So we were stuck and stayed at Zod 3.

Now, we can talk about more and more workarounds to the problems above (and others)... but of course, those workarounds will produce more and more new problems, as shown above. And we haven't even touched the fact that most form libraries lock you into a specific JS Framework yet, nor the edge cases that libraries like `React Hook Form` fail to tackle!

**_Please!_** Someone deliver us from this pit of madness!

## Escaping the Pit with Form-Associated Custom Elements

Hopefully you can start to see _just how deep_ the rabbit hole goes when we incorrectly try to address the _native `<form>` integration problem_ as if it was a _state management problem_. What would life look like if we just used [form-associated Custom Elements](https://web.dev/articles/more-capable-form-controls#form-associated_custom_elements) for our `<Select>` component (and our other custom form controls) instead? Well, it would look nice and simple... just like it did at the beginning of this article.

Imagine that we used the [`Combobox` Web Component group](https://github.com/ITenthusiasm/custom-elements/tree/main/src/Combobox#install) provided by the [`@itenthusiasm/custom-elements`](https://www.npmjs.com/package/@itenthusiasm/custom-elements) NPM Package. Then our `<Select>` component might look something like this:

```tsx
import type {} from "@itenthusiasm/custom-elements/Combobox/types/react.d.ts";

export default function Select({ children, ...rest }: React.ComponentPropsWithRef<"combobox-field">) {
  return (
    <select-enhancer>
      <combobox-field {...rest}></combobox-field>
      <combobox-listbox>{children}</combobox-listbox>
    </select-enhancer>
  );
}

export function Option(props: React.ComponentPropsWithRef<"combobox-option">) {
  return <combobox-option {...props} />;
}
```

Now our `<Select>` component uses a form-associated Custom Element under the hood.

> Note: The `<combobox-field>` is analogous to the `<select>` element in that it is responsible for maintaining all of the `Combobox` component's form data/state and associating it with the owning `<form>` element. Just like native controls, the `<combobox-field>` is automatically associated with its wrapping `<form>` (or with the `<form>` whose ID matches its [`form` attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/form)).

This means that we can simplify our code back to what it looked like in the beginning:

```tsx
import { useState } from "react";

export default function SignUpForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); // Prevent the browser from submitting the form at all. We will submit the data manually.
    const form = event.currentTarget;
    const valid = form.reportValidity();
    if (!valid) return;

    setIsSubmitting(true);
    const headers = new Headers({ "Content-Type": "application/x-www-form-urlencoded" });
    const response = await fetch(form.action, { method: form.method, body: new FormData(form), headers });
    // Do something with the response...
    setIsSubmitting(false);
  }

  return (
    <form method="post" action="<MY_URL>" noValidate onSubmit={handleSubmit}>
      <label htmlFor="email">Email</label>
      <input id="email" name="email" type="email" pattern="<STRICT_EMAIL_REGEX>" required />

      <label htmlFor="password">Password</label>
      <input id="password" name="password" type="password" pattern="<PASSWORD_REGEX>" required />

      <ShippingAddressSubForm />
      <BillingAddressSubForm />
      <button type="submit" disabled={isSubmitting}>
        Submit
      </button>
    </form>
  );
}
```

Since the `<Select>` component renders a form control that integrates with the native `<form>` element, we no longer need reactive state or React Context. The `FormData` (and the `HTMLFormElement` itself) will already have access to every `<Select>` component's form value, no matter how deeply nested the form control is. Additionally, `form.reportValidity()` will work again because the form-associated Custom Element used by the `<Select>` component maintains and exposes its own [`ValidityState`](https://developer.mozilla.org/en-US/docs/Web/API/ValidityState).

Now our application is simplier _and_ more performant because: 1&rpar; It no longer requires large reactive state objects, 2&rpar; It doesn't require us to learn a form state management library, and 3&rpar; It doesn't require us to add an entire form library to our application's bundle size. As an added bonus, this also makes our app more resilient because upgrades will no longer be blocked by a form library's deprecation (or other limitations).

## It's Time to Move Forward

I know that was a lot to read. But hopefully it all gave you deeper insight into what the **_real_** problem with modern web forms is, and why form state management libraries **_are not_** its solution. (That said, I could foresee someone creating a _very-lightweight_ form library that simplifies things by requiring developers to integrate every field with the native web `<form>`.)

React Hook Form was a **_brilliant_** solution back when form-associated Custom Elements weren't yet [`Baseline Widely Available`](https://developer.mozilla.org/en-US/docs/Glossary/Baseline/Compatibility) in browsers. (For stateful form libraries that appeared _after_ we obtained widely-available form-associated Custom Elements... well... they don't really have an excuse. 😅) But times have changed!

We no longer need to pull everything into reactive state. Why? **_Because now we're able to integrate everything into the native `<form>` element's state instead_**. This saves us from having to partake in any form library's wheel re-inventions (and the unexpected bugs that come from doing so).

When you use a form library, you're forced to build your custom components (like the `<Select>` and `<Input>` shown above) in a way that integrates with your library (e.g., `React Hook Form`). But if you're going to integrate your components with some kind of tool anyway, why not integrate them with the browser's native features instead of a form library? Integrating your components with the browser's `<form>` element will give you all the features you need, but without any bundle size bloat, performance degradation, risks of library deprecation, or any other problems.

## Regarding Error Handling...

Okay, now for the elephant in the room: **_Accessible_**, **_User-friendly_** Error handling!

Yes, I will readily admit that the browser's native solutions for error handling are lackluster. Browsers do a great job at managing error states and error messages! But _displaying_ those error messages is where they fall short: Browsers only show error messages to the user for one field at a time (meaning that the user has to submit an invalid form _multiple_ times to know what every field's problem is), and these messages aren't very appealing to the eye.

That said, it is a _very trivial matter_ to create a delegated event listener that [looks at each part of an element's `ValidityState` and renders the correct error message to the DOM](https://github.com/enthusiastic-js/form-observer/blob/main/packages/core/FormValidityObserver.js#L337-L358) &mdash; whether by rendering the error directly to the DOM, or by rendering it to a stateful "Errors Object" which in turn renders error strings to the DOM by field name (e.g., `errors.email`). The [`FormValidityObserver`](https://github.com/enthusiastic-js/form-observer/tree/main/docs/form-validity-observer) provided by the [`@form-observer/core`](https://www.npmjs.com/package/@form-observer/core) NPM Package does this for you. But you're welcome to build this yourself if you prefer.

Below is an example using the `FormValidityObserver`:

```tsx
import { useState } from "react";
import { FormValidityObserver } from "@form-observer/core";

// Create an observer which validates fields on `blur`, and re-validates them on `input` after `blur` or `submit`.
const observer = useMemo(() => new FormValidityObserver("focousout", { revalidateOn: "input" }), []);

// React 19 Callback Ref to observe the `<form>` on mount and unobserve it on unMount.
function autoObserve(element: HTMLFormElement) {
  element.toggleAttribute("novalidate", true);
  observer.observe(form);
  return () => observer.unobserve(form);
},

export default function SignUpForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); // Prevent the browser submitting the form at all. We will submit the data manually.
    const form = event.currentTarget;
    const valid = observer.validateFields({ focus: true });
    if (!valid) return;

    setIsSubmitting(true);
    const headers = new Headers({ "Content-Type": "application/x-www-form-urlencoded" });
    const response = await fetch(form.action, { method: form.method, body: new FormData(form), headers });
    // Do something with the response...
    setIsSubmitting(false);
  }

  return (
    <form ref={autoObserve} method="post" action="<MY_URL>" onSubmit={handleSubmit}>
      <label htmlFor="email">Email</label>
      <input
        id="email"
        name="email"
        type="email"
        pattern="<STRICT_EMAIL_REGEX>"
        required
        aria-describedby="email-error"
      />
      <div id="email-error" role="alert"></div>

      <label htmlFor="password">Password</label>
      <input
        id="password"
        name="password"
        type="password"
        pattern="<PASSWORD_REGEX>"
        required
        aria-describedby="email-error"
      />
      <div id="password-error" role="alert"></div>

      <ShippingAddressSubForm />
      <BillingAddressSubForm />
      <button type="submit" disabled={isSubmitting}>
        Submit
      </button>
    </form>
  );
}
```

What's most important here is that **_this library didn't require any changes to our underlying custom components_**. All that we had to do was:

1. Instantiate a `FormValidityObserver`.
2. Observe the `<form>` of interest on mount (and unobserve it on unMount).
3. Replace `form.reportValidity()` with `observer.validateFields()`.

You might also want some CSS to hide/unhide the error message containers based on whether or not they are [`:empty`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/:empty). (You can hide/unhide them based on whether or not the owning form field is [`aria-invalid`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-invalid) instead if you prefer.)

The `FormValidityObserver` also supports customized error messages (and more). If you're working in React, it will be more convenient to set these up with the [`@form-observer/react`](https://www.npmjs.com/package/@form-observer/react) package, which provides a tiny wrapper around the `FormValidityObserver` that is built to be easier for use in React apps.

```tsx
import { useState } from "react";
import { createFormValidityObserver } from "@form-observer/react";

// Create an observer which validates fields on `blur`, and re-validates them on `input` after `blur` or `submit`.
export const observer = createFormValidityObserver("focusout", {
  revalidateOn: "input",
  defaultErrors: {
    required: (field: ValidatableField) => `${field.labels?.[0].textContent ?? "This field"} is required.`,
  },
});

const autoObserve = observer.autoObserve();
const { configure, validateFields } = observer;

export default function SignUpForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    // Same simple implementation as before ...
  }

  return (
    <form ref={autoObserve} method="post" action="<MY_URL>" onSubmit={handleSubmit}>
      <label htmlFor="email">Email</label>
      <input
        id="email"
        required
        aria-describedby="email-error"
        {...configure("email", {
          type: { value: "email", message: "Invalid Email..." },
          pattern: { value: "<STRICT_EMAIL_REGEX>", message: "Invalid Email..." },
        })}
      />
      <div id="email-error" role="alert"></div>

      <label htmlFor="password">Password</label>
      <input
        id="password"
        type="password"
        required
        aria-describedby="email-error"
        {...configure("password", { pattern: { value: "<PASSWORD_REGEX>", message: "Weak Password..." } })}
      />
      <div id="password-error" role="alert"></div>

      <ShippingAddressSubForm />
      <BillingAddressSubForm />
      <button type="submit" disabled={isSubmitting}>
        Submit
      </button>
    </form>
  );
}
```

You'll notice that because `createFormValidityObserver` doesn't rely on any state, it _does not_ have to be created within the React Component (freeing you from having to use `useMemo()` or `useCallback()`). You can simply export the `observer` object and import it directly into the sub components in your forms as needed. The regular `FormValidityObserver` class has the same advantage because it does not rely on reactive state either.

By default, the `FormValidityObserver` will render error messages directly to the DOM. This is safe to do both in pure JS applications _and_ in JS Frameworks. However, if you prefer to render your error messages with reactive state, you are welcome to do so. It will just mean you'll have to introduce React Context again to make sure your nested form sections know if they should render any error messages.

You can learn more about how to accomplish these feats and more by looking at the [documentation](https://github.com/enthusiastic-js/form-observer/tree/main/docs/form-validity-observer) for the `FormValidityObserver` and its framework-specific convenience wrappers.

## Conclusion

We're in a new era of web form development in 2026. Now that form-associated Custom Elements are Baseline Widely Available, we can reclaim all of the form state management features that browsers have provided out-of-the box for years. We no longer have to adopt form state management libraries or the baggage/risks which they bring.

If you _must_ reach for a form library, try one that addresses the _remainder_ of the browser's unresolved problems instead of reaching for libraries which effectively re-invent all of the browser's features (and push you down a slippery slope of complex state management in the process). This will give you several benefits, as described above. Some especially useful benefits are:

1. Simpler code maintenance
2. Reduced application bundle size
3. Reduced road blocks to package upgrades (and/or greater pivoting ease if your library becomes deprecated/unusable)

The `@form-observer/core` package (and friends) is one such solution. But you don't have to try the library that I'm shilling. 🙂 You can try another one that does something similar, or write your own delegated event listener if you prefer.

_P.S.: If you think tools like `React Native` are a reason to reach for libraries like `React Hook Form` or `TanStack Form`, then check out [`Tauri`](https://v2.tauri.app/). It allows you to build mobile apps using a phone's native webview. To oversimplify things, this native webview is a lightweight browser that already exists on users' devices, so you'll still be able to use libraries like the `FormValidityObserver` which rely on the browser's native `<form>` features. And you'll be able to do so in whichever framework you want, not just React!_
