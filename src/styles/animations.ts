import type { CSSProperties } from 'react';

export function staggeredFadeUp(index: number, baseDelay = 50): CSSProperties {
  return {
    animation: `fadeUp 0.4s ease ${index * baseDelay}ms both`,
  };
}
