/**
 * FleetControl — Design Tokens: Animações
 */

export const duration = {
  instant: '0ms',
  fast: '100ms',
  normal: '200ms',
  slow: '300ms',
  slower: '500ms',
} as const;

export const easing = {
  linear: 'linear',
  in: 'cubic-bezier(0.4, 0, 1, 1)',
  out: 'cubic-bezier(0, 0, 0.2, 1)',
  inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const;

export const keyframes = {
  fadeIn: {
    from: {opacity: '0'},
    to: {opacity: '1'},
  },
  fadeOut: {
    from: {opacity: '1'},
    to: {opacity: '0'},
  },
  slideUp: {
    from: {opacity: '0', transform: 'translateY(8px)'},
    to: {opacity: '1', transform: 'translateY(0)'},
  },
  slideDown: {
    from: {opacity: '0', transform: 'translateY(-8px)'},
    to: {opacity: '1', transform: 'translateY(0)'},
  },
  spin: {
    from: {transform: 'rotate(0deg)'},
    to: {transform: 'rotate(360deg)'},
  },
  pulse: {
    '0%, 100%': {opacity: '1'},
    '50%': {opacity: '0.5'},
  },
  shimmer: {
    '0%': {backgroundPosition: '-200% 0'},
    '100%': {backgroundPosition: '200% 0'},
  },
} as const;

export const animations = {
  fadeIn: `fade-in ${duration.normal} ${easing.out}`,
  fadeOut: `fade-out ${duration.normal} ${easing.in}`,
  slideUp: `slide-up ${duration.normal} ${easing.out}`,
  slideDown: `slide-down ${duration.normal} ${easing.out}`,
  spin: `spin 1s ${easing.linear} infinite`,
  pulse: `pulse 2s ${easing.inOut} infinite`,
  shimmer: `shimmer 2s ${easing.linear} infinite`,
} as const;
