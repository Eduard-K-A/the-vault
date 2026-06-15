import type React from 'react';

export const navigateMock = jest.fn();
export const goBackMock = jest.fn();
export const canGoBackMock = jest.fn(() => false);
export const setOptionsMock = jest.fn();
export const routeParams: Record<string, unknown> = {};

export function useNavigation() {
  return {
    navigate: navigateMock,
    goBack: goBackMock,
    canGoBack: canGoBackMock,
    setOptions: setOptionsMock,
  };
}

export function useRoute() {
  return {
    params: routeParams,
  };
}

export function useFocusEffect(effect: () => void | (() => void)): void {
  const cleanup = effect();
  if (typeof cleanup === 'function') {
    cleanup();
  }
}

export const NavigationContainer = ({ children }: { children: React.ReactNode }) => children;
export const DefaultTheme = {
  colors: {
    primary: '',
    background: '',
    card: '',
    text: '',
    border: '',
    notification: '',
  },
};

export function resetNavigationMocks(): void {
  navigateMock.mockClear();
  goBackMock.mockClear();
  canGoBackMock.mockReset().mockReturnValue(false);
  setOptionsMock.mockClear();
  for (const key of Object.keys(routeParams)) {
    delete routeParams[key];
  }
}
