import type { Page, Locator } from "@playwright/test";

/**
 * Renders the provided HTML template string to the provided `page`, replacing all of the contents
 * of the `body` on that page.
 *
 * @deprecated Use {@link renderHTMLTo} instead.
 *
 * @example
 * renderHTMLToPage(page)`
 *   <div>Hello</div>
 *   <div>World</div>
 * `;
 */
export function renderHTMLToPage(page: Page) {
  return renderHTMLTo(page);
}

/**
 * Renders the provided HTML template string to the provided `target` using {@link Element.innerHTML},
 * which replaces all of the `target`'s contents in the process.
 *
 * Note: If you want a less-destructive function which simply _inserts_ HTML into the provided `target`,
 * use {@link insertAdjacentHTML} instead.
 *
 * @param target Indicates the element on which {@link Element.innerHTML} will be called. If `target` is
 * a {@link Locator}, then the setter will be called on the element referenced by the locator. If `target` is
 * a {@link Page}, then the setter will be called on the page's {@link Document.body}.
 *
 * @example
 * renderHTMLTo(page)`
 *   <div>Hello</div>
 *   <div>World</div>
 * `;
 */
export function renderHTMLTo(target: Page | Locator) {
  const locator = "page" in target ? target : target.locator("body");

  return function html(strings: TemplateStringsArray, ...values: string[]): Promise<void> {
    const markup = String.raw({ raw: strings }, ...values);
    return locator.evaluate((node, template) => void (node.innerHTML = template), markup);
  };
}

/**
 * Inserts the provided HTML template string into the DOM tree at the specified location
 * using the native {@link Element.insertAdjacentHTML} method.
 *
 * Note: This action is _additive_. It always _inserts_ new content rather than replacing existing content.
 * If you want to _replace_ an element's content, call {@link renderHTMLTo} instead.
 *
 * @param position Same as the `position` argument for {@link Element.insertAdjacentHTML}.
 * @param target Indicates the element on which {@link Element.insertAdjacentHTML} will be called. If `target` is
 * a {@link Locator}, then the method will be called on the element referenced by the locator. If `target` is
 * a {@link Page}, then the method will be called on the page's {@link Document.body}.
 *
 * @example
 * insertAdjacentHTML("beforeend", page)`
 *   <div>Hello</div>
 *   <div>World</div>
 * `;
 */
export function insertAdjacentHTML(position: InsertPosition, target: Page | Locator) {
  const locator = "page" in target ? target : target.locator("body");

  return function html(strings: TemplateStringsArray, ...values: string[]): Promise<void> {
    const markup = String.raw({ raw: strings }, ...values);
    const inputs = [position, markup] as const;
    return locator.evaluate((node, [where, template]) => node.insertAdjacentHTML(where, template), inputs);
  };
}

/**
 * Produces a massive {@link HTMLDivElement} as a DOM String.
 * Used to force a web page to become scrollable, enabling tests to examine the page's scroll behavior.
 * (For example, you may want to test the scroll-prevention functionality of a web component.)
 */
export function createMassiveBlock(): string {
  return `
    <div style="font-size: 3rem; font-weight: bold; text-align: right; background-color: red; height: 500vh;">
      Container for testing scroll prevention
    </div>
  `;
}
