import type { Page } from "@playwright/test";

/**
 * Renders the provided HTML template string to the provided `page`, replacing all of the contents
 * of the `body` on that page.
 *
 * @example
 * renderHTMLToPage(page)`
 *   <div>Hello</div>
 *   <div>World</div>
 * `;
 */
export function renderHTMLToPage(page: Page) {
  return function html(strings: TemplateStringsArray, ...values: string[]): Promise<void> {
    const markup = String.raw({ raw: strings }, ...values);
    return page.evaluate((template) => void (document.body.innerHTML = template), markup);
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
