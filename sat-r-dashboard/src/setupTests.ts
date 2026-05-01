import '@testing-library/jest-dom';

// Mocks adicionales si son necesarios para ResizeObserver (usado por Recharts)
if (typeof ResizeObserver === 'undefined') {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
