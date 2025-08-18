import { useEffect, useState, useRef } from "react";

export const DEFAULT_DEBOUNCE_DELAY = 500;

export function useDebounce<T>(
  value: T,
  delay: number = DEFAULT_DEBOUNCE_DELAY,
): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [value, delay]);

  return debouncedValue;
}
