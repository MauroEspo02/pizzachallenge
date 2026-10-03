/** Numero che sale fino al valore finale (per il reveal). */
import { useEffect, useState } from 'react';
import { formatScore } from '../../../utils/format';

export function CountUp({ value, digits = 2, duration = 1100, delay = 0 }: { value: number | null; digits?: number; duration?: number; delay?: number }) {
  const [shown, setShown] = useState<number | null>(value === null ? null : 0);
  useEffect(() => {
    if (value === null) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setShown(value);
      return;
    }
    let frame = 0;
    const start = performance.now() + delay;
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / duration));
      const eased = 1 - (1 - t) ** 3;
      setShown(value * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration, delay]);
  return <>{formatScore(shown, digits)}</>;
}
