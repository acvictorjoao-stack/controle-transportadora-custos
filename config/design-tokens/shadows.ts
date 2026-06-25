/**
 * FleetControl — Design Tokens: Sombras
 * Sombras sutis — evitar aparência pesada de ERP
 */

export const shadows = {
  none: 'none',
  xs: '0 1px 2px 0 rgb(0 0 0 / 0.03)',
  sm: '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.04)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.08), 0 8px 10px -6px rgb(0 0 0 / 0.04)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.04)',
  focus: '0 0 0 3px rgb(79 70 229 / 0.25)',
  card: '0 1px 2px 0 rgb(0 0 0 / 0.04), 0 0 0 1px rgb(0 0 0 / 0.03)',
  dropdown: '0 4px 16px 0 rgb(0 0 0 / 0.08), 0 0 0 1px rgb(0 0 0 / 0.04)',
} as const;
