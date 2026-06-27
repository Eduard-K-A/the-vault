import React from 'react';

import { RowGroup, SegmentedControl } from '@/components/ui';
import { useThemeStore, type ThemeMode } from '@/store/themeStore';

const OPTIONS: { label: string; value: ThemeMode }[] = [
  { label: 'System', value: 'system' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
];

/** Appearance control: switch between system, light, and dark themes. */
export function ThemeToggle() {
  const mode = useThemeStore((state) => state.mode);
  const setMode = useThemeStore((state) => state.setMode);

  return (
    <RowGroup label="Appearance">
      <SegmentedControl
        accessibilityLabel="Theme"
        value={mode}
        options={OPTIONS}
        onChange={(value) => setMode(value as ThemeMode)}
      />
    </RowGroup>
  );
}
