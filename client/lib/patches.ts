// Global patches for browser quirks that produce noisy, non-actionable errors.

if (typeof window !== "undefined") {
  const resizeObserverMessages = [
    "ResizeObserver loop completed with undelivered notifications.",
    "ResizeObserver loop limit exceeded",
  ];

  // Prevent the ResizeObserver loop error from bubbling and breaking error overlays
  const onWindowError = (e: ErrorEvent) => {
    const msg = e?.message || "";
    if (resizeObserverMessages.some((m) => msg.includes(m))) {
      e.stopImmediatePropagation?.();
      e.preventDefault?.();
    }
  };
  window.addEventListener("error", onWindowError);

  // Sometimes appears via unhandledrejection in dev overlays
  window.addEventListener("unhandledrejection", (e) => {
    const msg = String((e as any)?.reason?.message || (e as any)?.reason || "");
    if (resizeObserverMessages.some((m) => msg.includes(m))) {
      e.preventDefault?.();
      e.stopImmediatePropagation?.();
    }
  });

  // Filter console spam for the same message
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  const shouldFilter = (...args: any[]) => {
    try {
      const flat = args
        .map((a) => (typeof a === "string" ? a : a?.message || ""))
        .join(" ");
      return resizeObserverMessages.some((m) => flat.includes(m));
    } catch {
      return false;
    }
  };
  console.error = (...args: any[]) => {
    if (shouldFilter(...args)) return;
    originalConsoleError.apply(console, args as any);
  };
  console.warn = (...args: any[]) => {
    if (shouldFilter(...args)) return;
    originalConsoleWarn.apply(console, args as any);
  };
}
