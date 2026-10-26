import { useMemo } from 'react';
import { ImageStyle, Platform, StyleSheet, TextStyle, useColorScheme, ViewStyle } from 'react-native';

export interface Theme {
  dark: boolean;
  bg: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  muted: string;
  border: string;
  accent: string;
  accentSoft: string;
  onAccent: string;
  bubble: string; // your own message bubble
  success: string;
  warning: string;
  danger: string;
  dangerSoft: string;
  shadow: string;
}

export const lightTheme: Theme = {
  dark: false,
  bg: '#F6F5FB',
  surface: '#FFFFFF',
  surfaceAlt: '#EFEDFA',
  text: '#14122B',
  muted: '#7B7A93',
  border: '#E7E5F4',
  accent: '#6D5DF6',
  accentSoft: '#ECE9FF',
  onAccent: '#FFFFFF',
  bubble: '#E9E6FF',
  success: '#16A34A',
  warning: '#D97706',
  danger: '#E5484D',
  dangerSoft: '#FDECEC',
  shadow: '#2B1F7A',
};

export const darkTheme: Theme = {
  dark: true,
  bg: '#0E0D1A',
  surface: '#171629',
  surfaceAlt: '#201E38',
  text: '#F3F2FF',
  muted: '#9795B5',
  border: '#272541',
  accent: '#8B7DFF',
  accentSoft: '#2A2650',
  onAccent: '#FFFFFF',
  bubble: '#2A2650',
  success: '#34D399',
  warning: '#FBBF24',
  danger: '#F87171',
  dangerSoft: '#3A1D24',
  shadow: '#000000',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 } as const;

export const type: Record<'display' | 'title' | 'heading' | 'body' | 'small' | 'caption', TextStyle> = {
  display: { fontSize: 32, fontWeight: '800', letterSpacing: -0.8 },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.4 },
  heading: { fontSize: 17, fontWeight: '700' },
  body: { fontSize: 15, lineHeight: 22 },
  small: { fontSize: 13, lineHeight: 18 },
  caption: { fontSize: 11, fontWeight: '600', letterSpacing: 0.4 },
};

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? darkTheme : lightTheme;
}

export function shadow(theme: Theme, level: 1 | 2 = 1): ViewStyle {
  return Platform.select<ViewStyle>({
    ios: {
      shadowColor: theme.shadow,
      shadowOpacity: theme.dark ? 0.4 : level === 1 ? 0.08 : 0.16,
      shadowRadius: level === 1 ? 12 : 20,
      shadowOffset: { width: 0, height: level === 1 ? 4 : 8 },
    },
    default: { elevation: level === 1 ? 2 : 6 },
  })!;
}

/** `const s = useStyles((t) => ({ box: { backgroundColor: t.surface } }))` */
export function useStyles<T extends Record<string, ViewStyle | TextStyle | ImageStyle>>(factory: (t: Theme) => T): T {
  const theme = useTheme();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => StyleSheet.create(factory(theme)), [theme]);
}
