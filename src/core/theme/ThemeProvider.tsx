import React, { createContext, useContext } from 'react';
import { colors, spacing, radii, typography, serviceConfig } from './tokens';

const theme = { colors, spacing, radii, typography, serviceConfig } as const;
type Theme = typeof theme;
const ThemeContext = createContext<Theme>(theme);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
