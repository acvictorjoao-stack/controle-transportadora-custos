/**
 * FleetControl — Design Tokens: Border Radius
 */

export const radius = {
  none: '0px',
  sm: '0.25rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '0.75rem',
  '2xl': '1rem',
  '3xl': '1.5rem',
  full: '9999px',
} as const;

/** Token padrão do design system (Vercel/Linear style) */
export const defaultRadius = radius.lg;
