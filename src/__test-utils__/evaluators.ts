/** A reusable {@link Page.evaluate} callback used to obtain the `window`'s scrolling dimensions */
export const getWindowScrollDistance = () => ({ x: window.scrollX, y: window.scrollY }) as const;
