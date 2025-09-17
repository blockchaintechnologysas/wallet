import { useCallback, useEffect, useRef, useState } from "react";

export function useNotice(timeoutMs = 3500) {
  const [notice, setNotice] = useState("");
  const timeoutRef = useRef<number | null>(null);

  const clear = useCallback(() => {
    setNotice("");
  }, []);

  const notify = useCallback(
    (message: string) => {
      setNotice(message);
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = window.setTimeout(() => {
        setNotice("");
      }, timeoutMs);
    },
    [timeoutMs]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { notice, notify, clear } as const;
}
