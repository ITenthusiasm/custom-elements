# Styling the `Combobox` Component

If you're familiar with CSS, then you should be able to get a good idea on how to customize the `Combobox` component's styles by looking at the [CSS](../../Combobox.css) that the library ships, and/or by playing with the component on [`StackBlitz`](https://stackblitz.com/edit/custom-elements-combobox?file=index.html,src%2Fmain.ts,src%2Fform.css). However, we've provided some tips here on how to style the component in case they are needed.

Remember: If you intend to customize the styles of the `Combobox` component _at all_, then we recommended creating your own CSS file to style the component. You can start off by copying the [library's CSS](../../Combobox.css) to this file, then modify it to fit your needs. With this approach, you'll only need to load/import your own CSS file, not the library's.

We recommend this approach because it will make your application's CSS Bundle Size smaller, and it will keep all of the component's styles in one file (for debuggability). However, if you prefer to import the library's CSS and then override it with your own CSS, you are welcome to do so.

## Recommended CSS Structure

We generally recommend the following structure for your `Combobox` component CSS file:

```css
select-enhancer {
  /* `SelectEnhancer` Styles */

  & > [role="combobox"] {
    /* `ComboboxField` Styles */

    & + [role="listbox"] {
      /* `ComboboxListbox` Styles */

      & > [role="option"] {
        /* `ComboboxOption` Styles */
      }
    }
  }
}
```

We recommend this structure because it is the most simple, clear, flexible, and reliable. Additionally, the use of [CSS Nesting](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Nesting) makes it easier to group your related styles together. If the use of [CSS Combinators](https://www.w3schools.com/cssref/css_ref_combinators.php) (`& > *` and `& + *`) and [Attribute Selectors](https://www.w3schools.com/cssref/css_selectors.php) (`[attr="value"]`) seems unorthodox to you, see our [philosophy](../extras/articles-to-be/pragmatic-css.md) on the matter to understand why we believe this is the best structure for your `Combobox` component's styles.

> Note: Notice that the `combobox`, `listbox`, and `option` roles are used in the CSS instead of the respective `<combobox-field>`, `<combobox-listbox>`, and `<combobox-option>` tag names. This is intended to give developers greater flexibility.
>
> For Example: If a developer [extends](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/extends) the `ComboboxField` to create a `MyComboboxField` class and associates it with a `<my-combobox-field>` tag name, the new Custom Element will still be given a `[role="combobox"]` attribute by the base class. Thus, developers won't need to worry about writing extra styles for their Custom Element class extension(s); they'll only have to focus on how they want to augment the JS logic.

## Styles by Use Case

In this section, we explain how you can style the different parts of the `Combobox` component. Note that some of the component's functionality is implemented using CSS rather than JS. There are four primary reasons for taking this approach:

1. Any actions which require DOM insertion/removal in JS (e.g., hiding/revealing options) will make a Web Component incompatible with most JS Frameworks. If the action is performed with CSS instead, then no compatibility issues will be encountered.
2. In many cases, this approach makes the component's overall JS logic simpler _and_ more performant.
3. This approach makes it easier to guarantee that accessibility requirements are met.
4. It gives greater flexibility to developers. (It's easier to override styles than it is to override internal class component methods.)

To demonstrate the benefits of this approach, consider the fact that the specification for accessible web applications states that a [`listbox`](https://www.w3.org/TR/wai-aria-1.2/#listbox) (in our case, the `ComboboxListbox`) should only be displayed when the associated [`combobox`](https://www.w3.org/TR/wai-aria-1.2/#combobox) (in our case, the `ComboboxField`) has set its [`aria-expanded`](https://www.w3.org/TR/wai-aria-1.2/#aria-expanded) attribute to the string `"true"`.

If you're using JavaScript to implement this logic, then you'll have to remember to toggle the visibility of the `listbox` in _every_ place where the `combobox` becomes expanded _or_ collapsed. You could technically simplify this effort by using an attribute-based [`MutationObserver`](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver). But it's much simpler to implement this logic in CSS instead:

```css
[role="listbox"] {
  display: flex;
  flex-direction: column;
}

[role="combobox"]:not([aria-expanded="true"]) + [role="listbox"] {
  display: none;
}
```

With this, we've basically encoded and satisfied the W3C Accessibility Spec directly in our CSS. And this code is much simpler (and more performant) than whatever we could come up with in JS! This is why some of the component's functionality is implemented in CSS instead of JS.

<!-- TODO: We should write an article on why anchoring CSS to A11y benefits codebases, then link to that article in the paragraph above. We want to avoid using too many words in this section because it will be more overwhelming for people who are primarily looking for help rather than philosphy. -->

### Styling the `SelectEnhancer`

Styling the `SelectEnhancer` is the easiest part. Typically, you'll just be using styles that make the Custom Element function effectively as a wrapper/container (e.g., [`position`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/position), [`display`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/display), and [`box-sizing`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/box-sizing) styles).

```css
select-enhancer {
  /* `SelectEnhancer` Styles */
}
```

### Styling the `ComboboxField`

```css
select-enhancer {
  & > [role="combobox"] {
    /* `ComboboxField` Styles */

    &[filter] {
      /* Styles when in Filter Mode */
    }

    &:focus {
      /* Styles when focused */
    }
  }
}
```

### Styling the `ComboboxListbox`

```css
select-enhancer {
  & > [role="combobox"] {
    & + [role="listbox"] {
      /* `ComboboxListbox` Styles */
      /* ... */

      &:is([role="combobox"]:not([aria-expanded="true"]) + [role="listbox"]) {
        /* Hide the `listbox` when the `combobox` is collapsed */
        display: none;
      }
    }
  }
}
```

> See MDN's documentation for the [`:is`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/:is) and [`:where`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/:where) selectors if you are unfamiliar with them. These are _very_ valuable to know, especially when using CSS Nesting to group your styles.

To display the `listbox` as a "popover", remember to give the `listbox` an [`absolute` position](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/position) with the appropriate [`z-index`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/z-index):

```css
select-enhancer {
  position: relative; /* Needed for the absolutely-positioned `listbox` */

  & > [role="combobox"] {
    & + [role="listbox"] {
      position: absolute;
      z-index: 2; /* Or whichever value is best for your needs */
    }
  }
}
```

[CSS Anchor Positioning](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Anchor_positioning) is a more powerful approach to positioning elements with respect to each other. It is available in most popular browsers, and soon it will be available in all of them.

### Styling the `ComboboxOption`s

```css
select-enhancer {
  & > [role="combobox"] {
    & + [role="listbox"] {
      & > [role="option"] {
        /* `ComboboxOption` Styles */

        &[data-active="true"] {
          /* Style the currently-active option (corresponds to `aria-activedescendant`) */
        }

        &[aria-selected="true"] {
          /* Style the selected option */
        }

        &[data-active="true"]:not([aria-selected="true"]) {
          /* Style the currently-active option if it is NOT selected */
        }

        &[aria-disabled="true"] {
          /* Style disabled option(s) */
        }

        &[data-filtered-out] {
          /* Hide filtered-out options */
          display: none;
          visibility: hidden;
        }
      }
    }
  }
}
```

> Note: Even though `display: none` should be enough to hide an element from visual users _and_ from the accessibility tree, this is not always true in Safari. Safari/VoiceOver has a bug where `display: none` elements with `[role="option"]` can be hidden visually yet still exposed to the accessibility tree. This issue is resolved by adding the `visibility: hidden` style. Hopefully, in the future, when Safari is fixed, only `display: none` will be required. Other browsers do not have this problem.

### Styling the "No Matches Message"

Most of the `Combobox` component's features are very easy to style. The "No Matches Message" is also fairly straightforward to style, but it requires a bit more work. This is because there are a limited number of ways to make a sophisticated component both flexibly stylable **_and_** compatible with _all_ JS Frameworks. Both of these needs are indispensable for the modern developer, so we tried to come up with solutions that would satisfy both requirements without being too cumbersome.

There are 2 ways to style/customize the "No Matches Message". We will present both, and you can choose whichever one you prefer.

#### Using Your Own Markup

This approach involves displaying the "No Matches Message" _without_ relying on the [`nomatchesmessage`](../combobox-field.md#attributes-nomatchesmessage) attribute of the `ComboboxField`.

The [`SelectEnhancer` API docs](../select-enhancer.md#adding-icons--buttons-to-the-selectenhancer) mention that you can put anything you want inside the `SelectEnhancer`. That really means _anything_, including your own custom "No Matches Message". For example, you might write markup like this:

```html
<label for="movies">Movies</label>
<select-enhancer>
  <combobox-field id="movies" name="movies" filter></combobox-field>
  <combobox-listbox>
    <combobox-option>Facing the Giants</combobox-option>
    <combobox-option>Dragon Ball Z: Resurrection F</combobox-option>
    <combobox-option>Road to Ninja: Naruto the Movie</combobox-option>
  </combobox-listbox>

  <div class="no-matches-message" aria-hidden="true">Nothing Found!</div>
</select-enhancer>
```

> Notice that the "No Matches Message" is marked as [`aria-hidden`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-hidden). This is because only Visual Users need this information. People who use a11y tools like Screen Readers will already be informed when no options are available for the current filter.

The `ComboboxField` acquires the `[data-bad-filter]` [`data-*` attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/How_to/Use_data_attributes) whenever the user's current filter has no matching options. It also acquires the `--bad-filter` [Custom State](https://developer.mozilla.org/en-US/docs/Web/API/CustomStateSet) when this happens. You can use _either_ of these states to style _and_ conditionally display your customized "No Matches Message". (**You do not need to use both.** Just use one. The former approach has better browser support, but the latter approach is more modern.)

```css
select-enhancer {
  & > [role="combobox"] {
    & ~ .no-matches-message {
      /* Hide the No Matches Message by default */
      display: none;

      /* Use either selector, NOT both */
      &:is([role="combobox"][data-bad-filter] ~ .no-matches-message),
      &:is([role="combobox"]:state(--bad-filter) ~ .no-matches-message) {
        /* Reveal and style the No Matches Message when the user's filter is bad */
        display: block;

        /* Other Styles ... */
      }
    }
  }
}
```

> If you are unfamiliar with the `& ~ *` CSS Combinator, you can learn about it and other combinators at [W3Schools](https://www.w3schools.com/cssref/css_ref_combinators.php).

Remember that typically your `listbox` will be absolutely positioned, and the "No Matches Message" will be rendered _outside_ the `listbox`. (This is _required_ because the web accessibility spec only allows `option`s and `group`s to be children of `listbox`es, and the "No Matches Message" _is not_ a real option that users can select.) Thus, if you want your "No Matches Message" to _look_ like it's an "option" within the `listbox`, then you'll have to absolutely position the message as well. You will also need to give the message the appropriate `padding`, `border`s, etc. to simulate the correct look and feel.

```css
select-enhancer {
  & > [role="combobox"] {
    & + [role="listbox"] {
      &:is([role="combobox"]:not([aria-expanded="true"]) + [role="listbox"]),
      &:is([role="combobox"][data-bad-filter] + [role="listbox"]) {
        /* Hide `listbox` if `combobox` is collapsed OR if user filter is bad */
        display: none;
      }
    }

    & ~ .no-matches-message {
      display: none;

      &:is([role="combobox"][data-bad-filter] ~ .no-matches-message) {
        display: block;
        position: absolute;
        z-index: 2; /* Or whichever value fits your needs */

        padding: var(--option-padding);
        border: var(--listbox-border);
        /* Other option-like Styles ... */
      }
    }
  }
}
```

Ignoring the CSS, the downside to this approach is verbosity: Each time you render a filterable `Combobox` component, you'll have to add some markup that represents your "No Matches Message". The benefit to this approach is that it feels fairly normal (from a markup perspective). However, this is more of a subjective, opinion-based benefit than an objective benefit.

#### Using CSS Only (Recommended)

This approach leverages the built-in [`nomatchesmessage`](../combobox-field.md#attributes-nomatchesmessage) attribute on the `ComboboxField` to display the "No Matches Message".

For a long time, developers have been able to render the value of an element's attribute as text by using the [`attr()`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/attr) CSS Function in conjunction with the [`content`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/content) CSS Property. Since the `ComboboxField` has a [`nomatchesmessage`](../combobox-field.md#attributes-nomatchesmessage) attribute which is [synced with the `ComboboxListbox`](../combobox-listbox.md#attributes-nomatchesmessage) that it owns, you can leverage this `attr()` + `content` technique to display the component's "No Matches Message".

```css
[role="combobox"][data-bad-filter] + [role="listbox"]::before {
  display: block;
  content: attr(nomatchesmessage, "No options found") / "";
  cursor: auto;
  /* Other Styles ... */
}
```

> Note: If you prefer, you can use the [`::after`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/::after) pseudo-element instead of [`::before`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/::before).

There are a few things to note here:

<ol>
  <li>
    Because the <code>::before</code> selector is only satisfied when the <code>combobox</code> is in the <code>[data-bad-filter]</code> state (or the <code>:state(--bad-filter)</code> state), the "No Matches Message" will only be rendered when the user's filter has no matching options.
  </li>
  <li>
    <p>
      The <code>::before</code> pseudo-element does not produce a real <code>HTMLElement</code> acknowledged by the DOM, and appending <code>/ ""</code> to the CSS <code>content</code> property hides the text from the accessibility tree.
    </p>
    <blockquote>
      <p>
        Note: This is <em>required</em> because the web accessibility spec only allows <code>option</code>s and <code>group</code>s to be children of <code>listbox</code>es, and the "No Matches Message" <em>is not</em> a real option that users can select. Also, Screen Reader Users don't need to see this text since they will already be told when their filter produces 0 matching <code>option</code>s in the <code>listbox</code>.
      </p>
    </blockquote>
  </li>
  <li>
    The <code>::before</code> pseudo-element is rendered <em>inside</em> the <code>listbox</code>, so it does not need to be absolutely positioned (unlike the message used in the <a href="#using-your-own-markup">other approach</a>).
  </li>
</ol>

If you want your "No Matches Message" to _look_ like your options, you can add an extra selector next to your `[role="option"]` selector:

```css
select-enhancer {
  & > [role="combobox"] {
    & + [role="listbox"] {
      /* Option Selector */
      & > [role="option"],
      /* "No Matches Message" Selector */
      &:is([role="combobox"][data-bad-filter] + [role="listbox"])::before {
        /* Both selectors use the `ComboboxOption` Styles */
      }

      /* Styles that belong ONLY to the "No Matches Message" */
      &:is([role="combobox"][data-bad-filter] + [role="listbox"])::before {
        content: attr(nomatchesmessage, "No options found") / "";
        cursor: auto;
      }
    }
  }
}
```

With these styles in place, you can customize the text content of the "No Matches Message" just by using the `nomatchesmessage` attribute.

```html
<label for="movies">Movies</label>
<select-enhancer>
  <combobox-field id="movies" name="movies" filter nomatchesmessage="Nothing Found!"></combobox-field>
  <combobox-listbox>
    <combobox-option>Facing the Giants</combobox-option>
    <combobox-option>Dragon Ball Z: Resurrection F</combobox-option>
    <combobox-option>Road to Ninja: Naruto the Movie</combobox-option>
  </combobox-listbox>
</select-enhancer>
```

And if you intend to use the same message for _all_ (or most) of your `Combobox` component instances, you can configure the static [`ComboboxField.defaultNoMatchesMessage`](../combobox-field.md#static-properties-defaultNoMatchesMessage) property:

```js
import { ComboboxField } from "@itenthusiasm/custom-elements";
// or import { ComboboxField } from "@itenthusiasm/custom-elements/Combobox";

ComboboxField.defaultNoMatchesMessage = "Nothing Found!";
```

This is sets the default value for the `nomatchesmessage` attribute of _every_ `ComboboxField`. Thus, if a given `ComboboxField`'s "No Matches Message" is the same as the default message, then you don't need to supply the attribute anymore.

```diff
- <combobox-field id="movies" name="movies" filter nomatchesmessage="Nothing Found!">
+ <combobox-field id="movies" name="movies" filter>
```

This approach has several benefits over the [other one](#using-your-own-markup). **First**, you don't have to write the markup for your "No Matches Message" in every place that you use the `Combobox` component. Instead, the message is rendered via CSS thanks to the `attr()` CSS Function. If you use the same "No Matches Message" across your entire application, then you only have to write your message once (i.e., when you configure the static `ComboboxField.defaultNoMatchesMessage` property).

**Second**, the CSS is simpler to write because the `::before` pseudo-element lives _within_ the `listbox` (without breaking any accessibility rules). This makes it easier to reuse your `[role="option"]` styles, and it spares you from having to write any absolute positioning styles for the message itself.

**Third**, this approach is still declarative! Instead of determining the "No Matches Message" with your markup, you're doing so with an attribute (or a "prop" if you're using a JS Framework.)

The only downside to this approach is that it's a little bit unusual. :&rpar; It's [sufficienlty] simple, it's framework-agnostic, it's fully-functional, and it's fully-reliable. But subjectively, some people might not prefer approaches that are different from what they're used to. So pick whichever approach feels best to you.

### Providing a Placeholder

Placeholder text [_is not_](https://www.w3.org/WAI/tutorials/forms/instructions#placeholder-text) a replacement for an accessible [`<label>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/label). However, you may occasionally find it helpful to add a placeholder to your accessibly-labeled form controls.

Typically, "placeholders" are implemented with an Empty Value Option (e.g., <code>&lt;combobox-option&nbsp;value=""&gt;Pick an Option&lt;/combobox-option&gt;</code>) when using the [`<select>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/select) element or the `Combobox` component. If you are using a `Combobox` component in Filter Mode, then there is an additional way that you can add placeholder text:

```css
select-enhancer {
  & > [role="combobox"] {
    position: relative;

    &[filter]:empty::after {
      display: block;
      content: attr(aria-placeholder) / "";
      position: absolute;
      cursor: text;
    }
  }
}
```

> Note: You might not need `position: absolute` and `position: relative`, depending on the browsers that you choose to support. If you _do_ need those CSS properties, you can position the placeholder text as needed with additional CSS. Hopefully, you shouldn't need anything more than what is shown above, however.

The CSS `content` property here is hidden from Screen Readers to prevent the form control's details from being read incorrectly. Visual Users will still be able to see/read the text, and Screen Readers should still announce the [`aria-placeholder`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-placeholder) attribute that you apply to the `ComboboxField`.

The only benefit of this approach is that it saves you from having to use an Empty Value Option when rendering a list of options to the UI for a `clearable` or `anyvalue` `ComboboxField`. (This approach doesn't make sense for `unclearable` `ComboboxField`s since they always require a valid option to be selected.) _Remember that this approach only works if the `Combobox` component is in Filter Mode._

<!--
TODO: Link to example of styling our `combobox` to look like GitHub's or ShadcnUI's. Maybe put it alongside an example of another styling approach.

## Examples of Custom Styles

- GitHub
-->
