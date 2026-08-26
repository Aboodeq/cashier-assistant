import { useEffect, useState } from "react";

/**
 * Reveals items one by one on mount, useful for staggered entrance animations.
 * Returns a function `isVisible(index)` that flips to true once that item's delay has elapsed.
 */
export function useStagger(count, delay = 90) {
  const [visible, setVisible] = useState([]);

  useEffect(() => {
    const timers = [];
    for (let i = 0; i < count; i++) {
      timers.push(setTimeout(() => setVisible((v) => [...v, i]), 250 + i * delay));
    }
    return () => timers.forEach(clearTimeout);
  }, [count, delay]);

  return (i) => visible.includes(i);
}
