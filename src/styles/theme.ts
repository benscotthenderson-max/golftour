/**
 * Dark Mode Editorial / Broadcast Luxury Design System Tokens
 * Master theme constants for GolfTour broadcast overhaul.
 */

export const EDITORIAL_THEME = {
  colors: {
    canvas: {
      void: '#07090C',         // Deepest background void
      base: '#0D1117',         // Standard mobile & app canvas
      surface: '#131923',      // Primary card surface
      surfaceElevated: '#1B2330', // Elevated modal / popover surface
      surfaceHighlight: '#242F42', // Hover / active surface state
      surfaceInput: '#0F151E', // Input field background
    },
    borders: {
      subtle: 'rgba(255, 255, 255, 0.06)',
      default: 'rgba(255, 255, 255, 0.08)',
      prominent: 'rgba(255, 255, 255, 0.14)',
      focus: 'rgba(16, 185, 129, 0.5)',
    },
    accents: {
      emerald: '#10B981',        // Masters Emerald Green
      emeraldHover: '#059669',
      emeraldLight: '#34D399',
      emeraldGlow: 'rgba(16, 185, 129, 0.22)',
      gold: '#F59E0B',           // Broadcast Leaderboard Gold
      goldLight: '#FCD34D',
      goldGlow: 'rgba(245, 158, 11, 0.22)',
      crimson: '#EF4444',        // Penalty / Alert
      crimsonGlow: 'rgba(239, 68, 68, 0.20)',
      sky: '#38BDF8',            // Neutral / Info
    },
    text: {
      primary: '#F8FAFC',        // Ultra-clear white
      secondary: '#94A3B8',      // Soft slate
      muted: '#64748B',          // De-emphasized caption
      dim: '#475569',            // Inactive / disabled
    },
  },
  radii: {
    chassis: 'rounded-[44px]',
    modal: 'rounded-3xl',
    card: 'rounded-2xl',
    inner: 'rounded-xl',
    button: 'rounded-xl',
    pill: 'rounded-full',
  },
  shadows: {
    card: 'shadow-[0_8px_32px_rgba(0,0,0,0.45)]',
    elevated: 'shadow-[0_20px_60px_rgba(0,0,0,0.7)]',
    glowEmerald: 'shadow-[0_0_20px_rgba(16,185,129,0.25)]',
    glowGold: 'shadow-[0_0_20px_rgba(245,158,11,0.25)]',
  }
} as const;

export const BROADCAST_LIGHT_THEME = {
  colors: {
    canvas: {
      void: '#F1F5F9',         // Crisp clean athletic slate void
      base: '#F8FAFC',         // Clean app canvas
      surface: '#FFFFFF',      // Pure white card surface
      surfaceElevated: '#FFFFFF', // Elevated card / modal
      surfaceHighlight: '#F1F5F9', // Hover / active state
      surfaceInput: '#F8FAFC', // Input field background
    },
    borders: {
      subtle: 'rgba(15, 23, 42, 0.06)',
      default: 'rgba(15, 23, 42, 0.09)',
      prominent: 'rgba(15, 23, 42, 0.16)',
      focus: 'rgba(5, 150, 105, 0.5)',
    },
    accents: {
      emerald: '#059669',        // Crisp Daylight Emerald
      emeraldHover: '#047857',
      emeraldLight: '#10B981',
      emeraldGlow: 'rgba(5, 150, 105, 0.20)',
      gold: '#D97706',           // Leaderboard Amber Gold
      goldLight: '#F59E0B',
      goldGlow: 'rgba(217, 119, 6, 0.20)',
      crimson: '#DC2626',        // Alert / Penalty
      crimsonGlow: 'rgba(220, 38, 38, 0.18)',
      sky: '#0284C7',
    },
    text: {
      primary: '#0F172A',        // High-contrast slate 900
      secondary: '#475569',      // Slate 600
      muted: '#64748B',          // Slate 500
      dim: '#94A3B8',            // Inactive slate 400
    },
  },
  radii: {
    chassis: 'rounded-[44px]',
    modal: 'rounded-3xl',
    card: 'rounded-2xl',
    inner: 'rounded-xl',
    button: 'rounded-xl',
    pill: 'rounded-full',
  },
  shadows: {
    card: 'shadow-[0_4px_20px_rgba(15,23,42,0.06)]',
    elevated: 'shadow-[0_16px_40px_rgba(15,23,42,0.12)]',
    glowEmerald: 'shadow-[0_0_16px_rgba(5,150,105,0.20)]',
    glowGold: 'shadow-[0_0_16px_rgba(217,119,6,0.20)]',
  }
} as const;

export function getActiveTheme(isDark: boolean) {
  return isDark ? EDITORIAL_THEME : BROADCAST_LIGHT_THEME;
}

export function hexToRgba(hex: string, alpha: number): string {
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    const r = parseInt(cleanHex[0] + cleanHex[0], 16) || 0;
    const g = parseInt(cleanHex[1] + cleanHex[1], 16) || 0;
    const b = parseInt(cleanHex[2] + cleanHex[2], 16) || 0;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
  const g = parseInt(cleanHex.substring(2, 4), 16) || 0;
  const b = parseInt(cleanHex.substring(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Returns clean team color styling with high contrast text and soft ambient glow
 */
export function getTeamColorStyle(colorHex?: string, isSelected?: boolean) {
  if (!colorHex) {
    return {
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      color: '#F8FAFC',
    };
  }

  const bgAlpha = isSelected ? 0.28 : 0.14;
  const borderAlpha = isSelected ? 0.65 : 0.30;
  const glowAlpha = isSelected ? 0.35 : 0.12;

  return {
    backgroundColor: hexToRgba(colorHex, bgAlpha),
    borderColor: hexToRgba(colorHex, borderAlpha),
    boxShadow: `0 0 16px ${hexToRgba(colorHex, glowAlpha)}`,
    color: '#FFFFFF',
  };
}
