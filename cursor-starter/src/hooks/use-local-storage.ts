"use client";

import { useCallback, useSyncExternalStore } from "react";

function getStorageItem<T>(key: string, initialValue: T): T {
  if (typeof window === "undefined") return initialValue;
  try {
    const item = window.localStorage.getItem(key);
    return item ? (JSON.parse(item) as T) : initialValue;
  } catch {
    return initialValue;
  }
}

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const value = useSyncExternalStore(
    (callback) => {
      const handler = (e: StorageEvent) => {
        if (e.key === key) callback();
      };
      window.addEventListener("storage", handler);
      return () => window.removeEventListener("storage", handler);
    },
    () => getStorageItem(key, initialValue),
    () => initialValue
  );

  const setValue = useCallback(
    (newValue: T | ((prev: T) => T)) => {
      try {
        const current = getStorageItem(key, initialValue);
        const valueToStore =
          newValue instanceof Function ? newValue(current) : newValue;
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
        // Dispatch a storage event so useSyncExternalStore re-reads
        window.dispatchEvent(
          new StorageEvent("storage", { key, newValue: JSON.stringify(valueToStore) })
        );
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, initialValue]
  );

  return [value, setValue];
}
