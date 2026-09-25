// NOTE: The `FlakyAnnotation` types need an improvement to handle Multi-Offender syntax. But this is fine for now.
type OSAnnotation = "Linux" | "Windows" | "MacOS";
type BrowserAnnotation = "Chrome" | "Firefox" | "Safari";
type TestModeAnnotation = "UI" | "Headless";
export type FlakyAnnotation =
  `FLAKY/${OSAnnotation | "ALL"}/${BrowserAnnotation | "ALL"}/${TestModeAnnotation | "ALL"}`;
