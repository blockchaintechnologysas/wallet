import { useEffect, useRef } from "react";

export function useBodyScrollLock(locked: boolean): void {
  const previous = useRef<string | null>(null);

  useEffect(() => {
    if (locked) {
      previous.current = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previous.current ?? "";
      };
    }
    document.body.style.overflow = previous.current ?? "";
    return () => undefined;
  }, [locked]);
}
