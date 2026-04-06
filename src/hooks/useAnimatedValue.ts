import { useState, useEffect, useRef } from 'react';

/**
 * Animates a numeric value over time (for count-up effects on the Bag display).
 */
export function useAnimatedValue(target: number, duration = 500): number {
  const [current, setCurrent] = useState(target);
  const prevRef = useRef(target);

  useEffect(() => {
    const from = prevRef.current;
    const diff = target - from;
    if (diff === 0) return;

    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(from + diff * eased));

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        prevRef.current = target;
      }
    }

    requestAnimationFrame(tick);
  }, [target, duration]);

  return current;
}
