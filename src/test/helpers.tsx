/* eslint-disable react-refresh/only-export-components */
import { type RenderOptions, render } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { SettingsProvider } from '../contexts/SettingsContext';

interface WrapperProps {
  children: ReactNode;
}

/**
 * Custom render that wraps components with required providers.
 */
function AllProviders({ children }: WrapperProps) {
  return <SettingsProvider>{children}</SettingsProvider>;
}

function customRender(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, { wrapper: AllProviders, ...options });
}

// Re-export everything from testing-library
export * from '@testing-library/react';
export { customRender as render };
