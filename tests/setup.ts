import { vi } from "vitest";

Object.defineProperty(globalThis, "chrome", {
  configurable: true,
  value: {
    storage: {
      local: {
        get: vi.fn(),
        set: vi.fn(),
        clear: vi.fn()
      }
    }
  }
});
