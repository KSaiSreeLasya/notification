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

  // Filter console.error spam for the same message
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    try {
      const str = args.map((a) => (typeof a === "string" ? a : "")).join(" ");
      if (resizeObserverMessages.some((m) => str.includes(m))) return;
    } catch {}
    originalConsoleError.apply(console, args as any);
  };
}
