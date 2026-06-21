import '@testing-library/jest-dom';

// Mocks adicionales si son necesarios para ResizeObserver (usado por Recharts)
if (typeof ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
