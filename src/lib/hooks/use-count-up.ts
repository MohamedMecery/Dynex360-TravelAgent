"use client";

import { useEffect, useState } from "react";

interface UseCountUpOptions {
  duration?: number;
  decimals?: number;
  enabled?: boolean;
}

export function useCountUp(
  target: number,
  { duration = 1200, decimals = 0, enabled = true }: UseCountUpOptions = {}
): string {
  const [current, setCurrent] = useState(enabled ? 0 : target);

  useEffect(() => {
    if (!enabled) {
      setCurrent(target);
      return;
    }

    const start = performance.now();
    let frameId = 0;

    const tick = (now: number): void => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      setCurrent(target * eased);
      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      } else {
        setCurrent(target);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [target, duration, enabled]);

  if (decimals > 0) {
    return current.toFixed(decimals);
  }
  return Math.round(current).toLocaleString("en-US");
}

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (): void => setReduced(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return reduced;
}
