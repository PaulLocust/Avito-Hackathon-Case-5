import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';

// Vitest запущен без globals, поэтому RTL не регистрирует автозачистку
// сам: без неё DOM между тестами одного файла копится и запросы падают
// на дубликатах.
afterEach(() => cleanup());

// antd в jsdom требует matchMedia и ResizeObserver: без них модалки и
// раскрывающиеся компоненты падают при монтировании.
const matchMediaMock = (query: string): MediaQueryList =>
  ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }) as MediaQueryList;

if (!window.matchMedia) {
  window.matchMedia = matchMediaMock;
}

if (!window.ResizeObserver) {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  window.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
}
