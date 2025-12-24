# CSS Should Be Pragmatic, Not Religious

One thing that always astounds me about frontend development is how impractically committed we as developers can become to certain methodologies of CSS. It's always good to take a step back and remember that even unfamiliar methodologies can be safe and practical.

## Example Problem: Tailwind

For example, some developers _absolutely abhor_ [TailwindCSS](https://tailwindcss.com/). Ofentimes, such developers accuse the tool of problems that it doesn't really have, despite never using the tool _effectively_ (keyword) themselves. Now don't get me wrong; the tool certainly has problems! (Everything does!) But if you stop to consider [Adam Wathan's thoughts](https://adamwathan.me/css-utility-classes-and-separation-of-concerns/) on CSS Utility Classes, or other people's discoveries on how [CSS has evolved over time](https://frontendmastery.com/posts/the-evolution-of-scalable-css/), you'll find that Tailwind actually has some _very powerful_ and _very valid_ use cases.

In my view, there are times when inline styles make more sense (and are more maintainable) than creating a new, separated file/chunk of CSS. And Tailwind is effectively a more advanced, more secure approach to inline styles. It's more advanced because you can leverage tools like [pseudo-classes](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/Pseudo-classes), [pseudo-elements](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/Pseudo-elements), [media queries](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Using) and more _while constraining everything to a well-defined Design System_. And it's more secure because all your "inline styles" connect to a single CSS file, enabling you to leverage strict [Content Security Policies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP).

However, there are also times when such "inline styles" are not as practical. And although there are TailwindCSS users on the other end of the spectrum who swear that they will _never_ go back to plain old CSS files, I think there are situations where plain old CSS is better. Particularly, I think this is the case when it comes to styling _components_. Complex, _[accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)-driven_ CSS for UI Components _is not_ very readable in Tailwind. (In fact, for a time, such CSS wasn't even possible in Tailwind.) And CSS that's harder to read is harder to maintain.

In my view, the ideal world is to have locally-scoped CSS for UI Components, and to use Utility CSS Classes for the more "inline-style-like" use cases. If your components are designed well, then you'll be able to apply such utility classes not only to basic `HTMLElement`s, but also to your components on an as-needed basis. One of [`Emotion`](https://emotion.sh/docs/introduction)'s primary maintainers takes a [similar approach](https://dev.to/srmagura/why-were-breaking-up-wiht-css-in-js-4g9b) to frontend development.

Now just like everyone else, I _don't_ have all the knowledge or expertise in the world. So my view of things isn't necessarily the "right way". But what I'm trying to get at is this: Developers would be much more efficient in their work if they were _open_ to new ideas and to leveraging multiple approaches/tools _in the situations where they shined the best_. But by stubbornly sticking to one tool/approach and hating others, developers put a lower productivity/maintainability ceiling on themselves, and they often try to force others to do the same. Not ideal.

## Why This Topic Matters

This topic of open vs. closed-mindedness matters because it's not just constrained to TailwindCSS. The problem also exists _within_ the community of people who prefer to use regular (S)CSS files. Particularly, there are developers who think that you should _only_ use CSS classes to style your elements. But I don't think that's necessarily true. Sure, I love CSS classes, and they're typically my goto for styles; but that doesn't mean they should _always_ be used for styles.

For example, consider a scenario where you want to style a disabled text input. You _could_ use CSS classes alone to get the job done:

```css
.input.text.disabled {
  /* Styles */
}
```

```html
<input class="input text disabled" type="text" disabled />
```

But why do that when the browser already provides selectors to style what you need?

```css
input[type="text"]:disabled {
  /* Styles */
}
```

```html
<input type="text" disabled />
```

The 2nd approach has several advantages over the 1st one:

1. It produces less HTML and avoids redundant "identifiers" (classes), resulting in a smaller, more efficient application.
   - `<input type="text" disabled>` is shorter than `<input class="input text disabled" type="text" disabled>`. And the classes used in the latter are redundant since all the distinguishing information is already present in the HTML itself. This redundancy adds up quickly if you have tons of form controls.
2. It gives you a clearer picture of _what_ is being styled.
   - In the 2nd example, you _know_ that the styles are being applied to a text `<input>` that is progrmatically disabled. With the 1st example, you don't know where the styles are being used or why. The only way for you to know _for certain_ is by _leaving_ your CSS file and _exploring_ the HTML first, which takes longer.
3. It doesn't require you to figure out the right CSS class names, which at times can be non-trivial cognitive overhead. Additionally, you won't have to think about how to prevent one set of CSS classes from clashing with another set of CSS classes in your codebase (more cognitive overhead).
4. It uses the Platform's features to target and style form controls instead of hacking/abusing CSS classes to produce the same result.
   - This saves you from having to write extra lines of code. For example, when using the class-based approach, you'll always need to write some kind of listener/observer which toggles the `.disabled` class on an `input` when it is disabled/enabled. This is unnecessary effort.

Now sure, someone may say, "Okay, but the styles in Example 2 are global! Is that safe?" And the answer is yes, they are safe. After all, a _robust_ web application will _consistently_ style its form controls with _little to no variations_. This means you _should not_ be defining wildly different `input[type="text"]:disabled` selector styles in various CSS files across your codebase. You should only need to define the styles _once_, and you really shouldn't add any variations. (But if you "need" variations, Tailwind can do the trick.)

In other words, the "clashing global styles" concern isn't realistic here. You actually _want_ global styles in this scenario, and there are ways to write them maintainably without overreaching any boundaries.

What about [CSS Combinators](https://www.w3schools.com/cssref/css_ref_combinators.php)? Some people say that writing CSS which styles elements based on positioning is unreliable. But is that really true? Sometimes it is, but other times it isn't. Consider the [`<details>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/details) element. [According to the spec](https://html.spec.whatwg.org/multipage/interactive-elements.html#the-details-element), its first direct descendant must _always_ be a [`<summary>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/summary) element. In that case, the following CSS is _always_ reliable:

```css
details > summary {
  /* Summary Styles */
}
```

There is no need for creating CSS classes that only duplicate the information of the `<summary>` element. Doing so will add extra cognitive overhead and bloat your bundle size without providing any genuine benefits. And this reasoning doesn't only apply to native elements like `<details>`/`<summary>`, but to complex UI Components as well. To prove this, consider the library's `Combobox` component.

In the case of the `Combobox` component, CSS classes are redundant identifiers (similar to the `<input>`/`<details>` scenarios) due to the constraints placed on the component itself. For example: In order for the component to be accessible to all users (including those who are visually impaired), the component _must_ use the [`combobox`](https://www.w3.org/TR/wai-aria-1.2/#combobox), [`listbox`](https://www.w3.org/TR/wai-aria-1.2/#listbox), and [`option`](https://www.w3.org/TR/wai-aria-1.2/#option) accessibility roles. And according to the spec, `option`s _must_ be placed inside `listbox`es, requiring the following:

```css
[role="listbox"] {
  & > [role="option"] {
  }
}
```

Additionally, the `SelectEnhancer` [requires](../../select-enhancer.md#adding-icons--buttons-to-the-selectenhancer) the `ComboboxListbox` to appear immediately after the `ComboboxField`, both of which must be direct descendants of the `SelectEnhancer`. This further requires what you see below:

```css
select-enhancer {
  & > [role="combobox"] {
    & + [role="listbox"] {
      & > [role="option"] {
        /* ... */
      }
    }
  }
}
```

If the elements' arrangement and accessible roles are already enforced by the W3C Accessibility Spec _and_ the `Combobox` component, why not rely on those constraints to style your component? It's straightforward and reliable, and it will save you from creating redundant CSS classes. Additionally, since all the styles are scoped within the `select-enhancer`, you won't need to worry about accidentally styling other `combobox`es, `listbox`es, or `option`s that are used outside of the `Combobox` component.

> Sidenote: Notice that the `combobox`, `listbox`, and `option` roles are used in the CSS instead of the respective `<combobox-field>`, `<combobox-listbox>`, and `<combobox-option>` tag names. This is intended to give developers greater flexibility.
>
> For example, if a developer extends the `ComboboxField` to create a `MyComboboxField` class and associates it with a `<my-combobox-field>` tag name, the new Custom Element will still be given a `[role="combobox"]` attribute by the base class. Thus, developers won't need to worry about writing extra styles for their class extension(s); they'll only have to focus on how they want to augment the JS logic.

## Conclusion

[Attribute Selectors](https://www.w3schools.com/cssref/css_selectors.php), [CSS Combinators](https://www.w3schools.com/cssref/css_ref_combinators.php), [Pseduo-classes](https://www.w3schools.com/cssref/css_ref_pseudo_classes.php) and more are excellent tools for styling your `HTMLElement`s. By leveraging _all_ of these techniques in the situations where they are most effective, you can write CSS that's more powerful, more succinct, and more maintainable than you could ever imagine. If you try styling your UI with tools other than classes (and perhaps try sprinkling in some Tailwind as well), I'm confident you'll find this to be true. If you don't agree, hopefully you can at least start to _understand_ why this library encourages taking certain approaches to CSS.

Thanks for reading! :&rpar;

<!-- TODO: Maybe write another article, "Why Data Attributes Are Better Than CSS Classes". Probably a cheeky and not-always-true title? So maybe we can think of something better. But the article itself might be helpful for enabling developers to unlock more of their potential as they discover new approaches to writing CSS. -->
