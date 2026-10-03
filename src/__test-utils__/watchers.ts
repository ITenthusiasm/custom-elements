/* eslint-disable guard-for-in */
import type { Page, Locator } from "@playwright/test";

/* ---------------------------------------- Types ---------------------------------------- */
interface ObservationErrorOptions<T> extends ErrorOptions {
  /** The amount of time that a process waited for the anticipated event */
  timeout: number;

  /**
   * A list containing all of the successful observations which occurred
   * _before_ the observation failure indicated by this error
   */
  observations: T[];
}

/**
 * Represents an error that occurred because an anticipated event was not observed in the expected amount of time.
 *
 * Typically used in Test Helper Functions like {@link createDOMEventWaiter} and {@link createErrorWatcher}
 * to track when an event was not dispatched (or an error was not thrown) in the expected amount of time.
 */
export class ObservationError<T = unknown> extends Error implements ObservationErrorOptions<T> {
  #timeout: ObservationErrorOptions<T>["timeout"];
  #observations: ObservationErrorOptions<T>["observations"];

  constructor(message: string, options: ObservationErrorOptions<T>) {
    super(message, options);
    this.#timeout = options.timeout;
    this.#observations = options.observations.slice();
  }

  get timeout() {
    return this.#timeout;
  }

  get observations() {
    return this.#observations;
  }
}

/* ---------------------------------------- Public Helpers ---------------------------------------- */
/**
 * Generates a helper function which tracks the number of times that an event of the specified `type`
 * is dispatched by the provided `target` element.
 *
 * @param target May be a {@link Page} or a {@link Locator}. If `target` is a `Locator`, then events will
 * only be counted if the event's target is the same element as the provided `target`. If `target` is a
 * `Page`, then all events of the specified `type` will be tracked, irrespective of the event's target,
 * and the event listener will be attached to the `Page`'s `Document`.
 * @param type The type of DOM event to listen for.
 * @param options A mixture of {@link EventListenerOptions} and some extra options specific to Playwright.
 */
export async function createDOMEventWaiter<T extends keyof DocumentEventMap, E extends DocumentEventMap[T]>(
  target: Page | Locator,
  type: T,
  options?: EventListenerOptions & {
    /** The **_constructor name_** of the event that you're expecting (e.g., `InputEvent`, `Event`, etc.). */
    event?: string;
    /**
     * Indicates that the tracking event handler should be attached to the `Document` even if
     * `target` is a `Locator`.
     */
    document?: boolean;
    timeout?: number;
  },
) {
  const events: E[] = [];
  const page = "page" in target ? target.page() : target;
  const [exposedPusherName] = await tryFunctionExposure(page, `push${type}event`, (e: unknown) => events.push(e as E));

  /** The timer related to {@link waitForDOMEvent}'s `Promise` rejection callback */
  let timer: NodeJS.Timeout | undefined;
  let resolve: Parameters<ConstructorParameters<typeof Promise<E[]>>[0]>[0] | undefined;
  const [exposedResolverName] = await tryFunctionExposure(page, "callNodeJSResolve", () => {
    clearTimeout(timer);
    resolve?.(events); // Optional chain used in case event(s) occurred before the user called `wait`
  });

  const locatorUsed = "page" in target;
  const locator = "page" in target ? target : page.locator("body");

  // Setup tracking event handler
  await locator.evaluate(
    (node, [t, lu, opts, pusherName, resolverName]) => {
      const constructor = opts?.event;
      const nodeWithListener = !lu || opts?.document ? document : node;
      nodeWithListener.addEventListener(t, handleEvent, opts);

      function handleEvent(evt: Event) {
        if (constructor && !eval(`evt.constructor === ${constructor}`)) return;
        if (lu && evt.target !== node) return;

        const props: Record<string, unknown> = { constructor };
        for (const key in evt) props[key] = evt[key as keyof typeof evt];
        (window as any)[pusherName](props); // eslint-disable-line @typescript-eslint/no-explicit-any
        (window as any)[resolverName](); // eslint-disable-line @typescript-eslint/no-explicit-any
      }
    },
    [type, locatorUsed, options, exposedPusherName, exposedResolverName] as const,
  );

  return waitForDOMEvent;
  async function waitForDOMEvent(): Promise<typeof events> {
    return new Promise((res, reject) => {
      resolve = res;
      const timeout = options?.timeout || 2000;
      const error = new ObservationError(`Timed out ${timeout}ms waiting for event "${type}".`, {
        timeout,
        observations: events,
      });

      timer = setTimeout(reject, timeout, error);
    });
  }
}

/**
 * Generates a helper function which tracks the number of times that a `pageerror` event occurs on the provided `page`.
 * @param page
 * @param options
 */
export function createErrorWatcher(page: Page, options?: { timeout?: number }) {
  /** The timer related to {@link waitForNextError}'s `Promise` rejection callback */
  let timer: NodeJS.Timeout | undefined;
  let resolve: Parameters<ConstructorParameters<typeof Promise<typeof errors>>[0]>[0] | undefined;

  page.on("pageerror", pushErrors);
  page.on("close", () => page.off("pageerror", pushErrors));

  const errors: Error[] = [];
  function pushErrors(error: Error) {
    clearTimeout(timer);
    errors.push(error);
    resolve?.(errors); // Optional chain used in case error(s) occurred before the user called `wait`
  }

  return waitForNextError;
  function waitForNextError(): Promise<typeof errors> {
    return new Promise((res, reject) => {
      resolve = res;
      const timeout = options?.timeout || 2000;
      const error = new ObservationError(`Timed out ${timeout}ms waiting for a \`pageerror\` to occur.`, {
        timeout,
        observations: errors,
      });

      timer = setTimeout(reject, timeout, error);
    });
  }
}

/* ---------------------------------------- Private Helpers ---------------------------------------- */
/**
 * A more-forgiving version of {@link Page.exposeFunction}.
 *
 * Attempts to expose the provided `callback` on the provided `page`. If the function's `name` is already taken, it
 * will be suffixed with an incremental counter until the suffixed function name is available on the page.
 *
 * For example, if `myFunc` is already exposed, then `myFunc1` will be checked. If `myFunc1` is already exposed, then
 * `myFunc2` will be checked, and so on, until the suffixed function name can be successfully/safely exposed on the page.
 *
 * @returns A tuple containing:
 * - The function name that was successfully exposed on the page
 * - The original result returned from {@link Page.exposeFunction}
 */
async function tryFunctionExposure<T extends Parameters<Page["exposeFunction"]>[0]>(
  page: Page,
  name: T,
  callback: Parameters<Page["exposeFunction"]>[1],
): Promise<[`${T}${number | ""}`, Awaited<ReturnType<Page["exposeFunction"]>>]> {
  let i = 0;
  let exposedFunctionNameUnavailable = true;
  let exposedFunctionName = name as `${T}${number | ""}`;

  while (exposedFunctionNameUnavailable) {
    const nameTaken = await page.evaluate((n) => n in window, exposedFunctionName);
    if (nameTaken) exposedFunctionName = `${name}${++i}` as typeof exposedFunctionName;
    else exposedFunctionNameUnavailable = false;
  }

  return [exposedFunctionName, await page.exposeFunction(exposedFunctionName, callback)];
}
